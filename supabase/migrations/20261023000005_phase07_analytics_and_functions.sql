-- =============================================================================
-- Migration: 20261023000005_phase07_analytics_and_functions.sql
-- Description: Database RPC functions for atomic scan persistence and dashboard analytics
-- Phase: PHASE_07 (Analytics Views and Atomic RPC Functions)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ATOMIC SCAN PERSISTENCE RPC
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.persist_scan(payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_user_id UUID;
    v_scan_id UUID;
    v_client_request_id UUID;
    v_existing_id UUID;
    v_evidence JSONB;
    v_item JSONB;
    v_explanation JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to persist scan';
    END IF;

    -- Check client_request_id idempotency
    IF payload ? 'client_request_id' AND payload->>'client_request_id' IS NOT NULL THEN
        v_client_request_id := (payload->>'client_request_id')::UUID;
        SELECT id INTO v_existing_id
        FROM public.scans
        WHERE user_id = v_user_id AND client_request_id = v_client_request_id;

        IF v_existing_id IS NOT NULL THEN
            RETURN v_existing_id;
        END IF;
    END IF;

    -- Insert primary scan record
    INSERT INTO public.scans (
        user_id,
        scan_type,
        title,
        normalized_input,
        input_hash,
        full_input,
        risk_score,
        risk_level,
        engine_version,
        is_pinned,
        rescan_of_scan_id,
        client_request_id
    ) VALUES (
        v_user_id,
        payload->>'scan_type',
        COALESCE(payload->>'title', payload->>'normalized_input'),
        payload->>'normalized_input',
        payload->>'input_hash',
        payload->>'full_input',
        (payload->>'risk_score')::SMALLINT,
        payload->>'risk_level',
        COALESCE(payload->>'engine_version', '1.0.0'),
        COALESCE((payload->>'is_pinned')::BOOLEAN, false),
        (payload->>'rescan_of_scan_id')::UUID,
        v_client_request_id
    )
    RETURNING id INTO v_scan_id;

    -- Insert evidence rows if present
    IF payload ? 'evidence' AND jsonb_typeof(payload->'evidence') = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'evidence')
        LOOP
            INSERT INTO public.scan_evidence (
                scan_id,
                user_id,
                category,
                indicator,
                is_observed,
                reason,
                score_contribution,
                source,
                observed_at,
                external_reference
            ) VALUES (
                v_scan_id,
                v_user_id,
                COALESCE(v_item->>'category', 'GENERAL'),
                v_item->>'indicator',
                COALESCE((v_item->>'is_observed')::BOOLEAN, true),
                COALESCE(v_item->>'reason', ''),
                COALESCE((v_item->>'score_contribution')::SMALLINT, 0),
                COALESCE(v_item->>'source', 'rules_engine'),
                COALESCE((v_item->>'observed_at')::TIMESTAMPTZ, now()),
                v_item->'external_reference'
            );
        END LOOP;
    END IF;

    -- Insert explanation if present
    IF payload ? 'ai_explanation' AND payload->'ai_explanation' IS NOT NULL THEN
        v_explanation := payload->'ai_explanation';
        INSERT INTO public.scan_explanations (
            scan_id,
            user_id,
            content,
            validation_status,
            is_fallback,
            model_name,
            prompt_version,
            generated_at
        ) VALUES (
            v_scan_id,
            v_user_id,
            v_explanation->'content',
            COALESCE(v_explanation->>'validation_status', 'fallback'),
            COALESCE((v_explanation->>'is_fallback')::BOOLEAN, false),
            v_explanation->>'model_name',
            v_explanation->>'prompt_version',
            COALESCE((v_explanation->>'generated_at')::TIMESTAMPTZ, now())
        );
    END IF;

    RETURN v_scan_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. DASHBOARD RISK DISTRIBUTION FUNCTION (SECURITY INVOKER)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_risk_distribution(range_days INTEGER DEFAULT 30)
RETURNS TABLE (
    risk_level TEXT,
    count BIGINT
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
    SELECT
        s.risk_level,
        COUNT(*)::BIGINT AS count
    FROM public.scans s
    WHERE s.user_id = auth.uid()
      AND (range_days IS NULL OR s.created_at >= (now() - (range_days || ' days')::INTERVAL))
    GROUP BY s.risk_level;
$$;

-- -----------------------------------------------------------------------------
-- 3. DASHBOARD SCANS OVER TIME FUNCTION (SECURITY INVOKER)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_scans_over_time(range_days INTEGER DEFAULT 30)
RETURNS TABLE (
    date DATE,
    count BIGINT,
    high_or_critical BIGINT
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
    SELECT
        DATE_TRUNC('day', s.created_at)::DATE AS date,
        COUNT(*)::BIGINT AS count,
        COUNT(*) FILTER (WHERE s.risk_level IN ('high', 'critical'))::BIGINT AS high_or_critical
    FROM public.scans s
    WHERE s.user_id = auth.uid()
      AND s.created_at >= (now() - (COALESCE(range_days, 30) || ' days')::INTERVAL)
    GROUP BY DATE_TRUNC('day', s.created_at)::DATE
    ORDER BY date ASC;
$$;

-- -----------------------------------------------------------------------------
-- 4. DASHBOARD TOP INDICATOR CATEGORIES (SECURITY INVOKER)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_top_indicator_categories(range_days INTEGER DEFAULT 30)
RETURNS TABLE (
    category TEXT,
    count BIGINT
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
    SELECT
        e.category,
        COUNT(*)::BIGINT AS count
    FROM public.scan_evidence e
    JOIN public.scans s ON s.id = e.scan_id
    WHERE e.user_id = auth.uid()
      AND s.created_at >= (now() - (COALESCE(range_days, 30) || ' days')::INTERVAL)
    GROUP BY e.category
    ORDER BY count DESC
    LIMIT 10;
$$;

-- -----------------------------------------------------------------------------
-- 5. RETENTION PURGE FUNCTION (Service Role Only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_expired_scans(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    IF retention_days IS NULL OR retention_days <= 0 THEN
        RETURN 0;
    END IF;

    DELETE FROM public.scans
    WHERE created_at < (now() - (retention_days || ' days')::INTERVAL);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_scans(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_expired_scans(INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.purge_expired_scans(INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_scans(INTEGER) TO service_role;
