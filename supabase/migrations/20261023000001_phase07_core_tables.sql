-- =============================================================================
-- Migration: 20261023000001_phase07_core_tables.sql
-- Description: Core schema for scans, evidence, explanations, and user settings
-- Phase: PHASE_07 (Database Persistence and Analytics)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Shared Updated At Trigger Function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1. SCANS TABLE (User-Owned)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scan_type TEXT NOT NULL CHECK (scan_type IN ('url', 'message')),
    title TEXT NOT NULL,
    normalized_input TEXT NOT NULL,
    input_hash TEXT NOT NULL,
    full_input TEXT NULL,
    risk_score SMALLINT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical', 'inconclusive')),
    engine_version TEXT NOT NULL DEFAULT '1.0.0',
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    rescan_of_scan_id UUID NULL REFERENCES public.scans(id) ON DELETE SET NULL,
    client_request_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint for client-request-id idempotency per user
CREATE UNIQUE INDEX IF NOT EXISTS uq_scans_user_client_request_id
    ON public.scans (user_id, client_request_id)
    WHERE client_request_id IS NOT NULL;

-- Query optimization indexes
CREATE INDEX IF NOT EXISTS idx_scans_user_created_id
    ON public.scans (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_scans_user_risk_level
    ON public.scans (user_id, risk_level);

CREATE INDEX IF NOT EXISTS idx_scans_user_scan_type
    ON public.scans (user_id, scan_type);

CREATE INDEX IF NOT EXISTS idx_scans_user_pinned
    ON public.scans (user_id, is_pinned)
    WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_scans_input_hash
    ON public.scans (user_id, input_hash);

CREATE TRIGGER trg_scans_updated_at
    BEFORE UPDATE ON public.scans
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. SCAN EVIDENCE TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scan_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    indicator TEXT NOT NULL,
    is_observed BOOLEAN NOT NULL DEFAULT true,
    reason TEXT NOT NULL,
    score_contribution SMALLINT NOT NULL DEFAULT 0,
    source TEXT NOT NULL CHECK (source IN ('rules_engine', 'ai', 'external_reputation')),
    observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    external_reference JSONB NULL
);

CREATE INDEX IF NOT EXISTS idx_evidence_scan_id
    ON public.scan_evidence (scan_id);

CREATE INDEX IF NOT EXISTS idx_evidence_user_category
    ON public.scan_evidence (user_id, category);

-- -----------------------------------------------------------------------------
-- 3. SCAN EXPLANATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scan_explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL UNIQUE REFERENCES public.scans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    validation_status TEXT NOT NULL CHECK (validation_status IN ('validated', 'fallback', 'failed_validation')),
    is_fallback BOOLEAN NOT NULL DEFAULT false,
    model_name TEXT NULL,
    prompt_version TEXT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_explanations_scan_id
    ON public.scan_explanations (scan_id);

-- -----------------------------------------------------------------------------
-- 4. USER SETTINGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    store_full_message_text BOOLEAN NOT NULL DEFAULT false,
    retention_days INTEGER NULL DEFAULT 90,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
