-- =============================================================================
-- CIPHER AI: Master Supabase Schema & Setup Script
-- Description: Complete, idempotent consolidation of all migrations (Phases 03, 07, 08).
-- Usage: Run this entire script once in the Supabase Dashboard -> SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. EXTENSIONS & COMPATIBILITY CHECKS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Defensive migration check: If an early Phase 03 scans table exists without the
-- required 'user_id' column, drop it cleanly so the unified schema can initialize.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'scans'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'scans' AND column_name = 'user_id'
    ) THEN
        DROP TABLE public.scans CASCADE;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. SHARED UTILITY TRIGGER FUNCTIONS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 2. CORE SCANS TABLE (User-Owned)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scan_type TEXT NOT NULL CHECK (scan_type IN ('url', 'message', 'email', 'batch_item')),
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
    email_metadata JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure optional columns and updated constraint exist if upgrading in-place
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS email_metadata JSONB DEFAULT NULL;

DO $$
BEGIN
    ALTER TABLE public.scans DROP CONSTRAINT IF EXISTS scans_scan_type_check;
    ALTER TABLE public.scans ADD CONSTRAINT scans_scan_type_check
        CHECK (scan_type IN ('url', 'message', 'email', 'batch_item'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_scans_user_client_request_id
    ON public.scans (user_id, client_request_id)
    WHERE client_request_id IS NOT NULL;

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

DROP TRIGGER IF EXISTS trg_scans_updated_at ON public.scans;
CREATE TRIGGER trg_scans_updated_at
    BEFORE UPDATE ON public.scans
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. SCAN EVIDENCE TABLE
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
-- 4. SCAN EXPLANATIONS TABLE
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
-- 5. USER SETTINGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    store_full_message_text BOOLEAN NOT NULL DEFAULT false,
    retention_days INTEGER NULL DEFAULT 90,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. CASES & INVESTIGATION WORKFLOW
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 120),
    description TEXT NULL CHECK (description IS NULL OR char_length(description) <= 2000),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'archived')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cases_user_status_updated
    ON public.cases (user_id, status, updated_at DESC);

DROP TRIGGER IF EXISTS trg_cases_updated_at ON public.cases;
CREATE TRIGGER trg_cases_updated_at
    BEFORE UPDATE ON public.cases
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Junction: case_scans
CREATE TABLE IF NOT EXISTS public.case_scans (
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    attached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (case_id, scan_id)
);

CREATE INDEX IF NOT EXISTS idx_case_scans_scan_id
    ON public.case_scans (scan_id);

CREATE INDEX IF NOT EXISTS idx_case_scans_user_id
    ON public.case_scans (user_id);

-- Case Notes
CREATE TABLE IF NOT EXISTS public.case_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 5000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_notes_case_created
    ON public.case_notes (case_id, created_at ASC);

DROP TRIGGER IF EXISTS trg_case_notes_updated_at ON public.case_notes;
CREATE TRIGGER trg_case_notes_updated_at
    BEFORE UPDATE ON public.case_notes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Case Events (Audit Trail)
CREATE TABLE IF NOT EXISTS public.case_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('scan_attached', 'scan_detached', 'note_added', 'status_changed')),
    reference_id UUID NULL,
    metadata JSONB NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_events_case_occurred
    ON public.case_events (case_id, occurred_at ASC);

-- -----------------------------------------------------------------------------
-- 7. TAGS & SCAN TAG ASSOCIATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tags_user_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user_name
    ON public.tags (user_id, name);

CREATE TABLE IF NOT EXISTS public.scan_tags (
    scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (scan_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_scan_tags_tag_id
    ON public.scan_tags (tag_id);

CREATE INDEX IF NOT EXISTS idx_scan_tags_user_id
    ON public.scan_tags (user_id);

-- -----------------------------------------------------------------------------
-- 8. EXTERNAL REPUTATION & FORENSICS (Phase 08)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reputation_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('match_found', 'no_match', 'inconclusive', 'provider_error', 'rate_limited', 'disabled')),
    categories TEXT[] NOT NULL DEFAULT '{}',
    summary TEXT NOT NULL DEFAULT '',
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    raw_ref JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reputation_checks_scan_id
    ON public.reputation_checks (scan_id);

CREATE INDEX IF NOT EXISTS idx_reputation_checks_user_provider
    ON public.reputation_checks (user_id, provider, checked_at DESC);

-- Shared reputation cache (zero user PII, global lookup)
CREATE TABLE IF NOT EXISTS public.reputation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL,
    status TEXT NOT NULL,
    categories TEXT[] NOT NULL DEFAULT '{}',
    summary TEXT NOT NULL DEFAULT '',
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reputation_cache_expires_at
    ON public.reputation_cache (expires_at);

-- Email attachment forensic metadata
CREATE TABLE IF NOT EXISTS public.email_attachments_meta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    size_bytes BIGINT NOT NULL DEFAULT 0,
    sha256 TEXT NOT NULL,
    risky_extension BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_scan_id
    ON public.email_attachments_meta (scan_id);

-- -----------------------------------------------------------------------------
-- 9. BATCH SCAN JOBS & ITEMS (Phase 08)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.batch_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Batch Scan',
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'cancelled', 'failed')),
    total INT NOT NULL DEFAULT 0,
    completed INT NOT NULL DEFAULT 0,
    failed INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_user_created
    ON public.batch_jobs (user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_batch_jobs_updated_at ON public.batch_jobs;
CREATE TRIGGER trg_batch_jobs_updated_at
    BEFORE UPDATE ON public.batch_jobs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.batch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.batch_jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    position INT NOT NULL DEFAULT 0,
    input TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_batch_item_batch_input UNIQUE (batch_id, input)
);

CREATE INDEX IF NOT EXISTS idx_batch_items_batch_status
    ON public.batch_items (batch_id, status);

DROP TRIGGER IF EXISTS trg_batch_items_updated_at ON public.batch_items;
CREATE TRIGGER trg_batch_items_updated_at
    BEFORE UPDATE ON public.batch_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 10. ROW-LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

-- Scans
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scans_select_owner ON public.scans;
CREATE POLICY scans_select_owner ON public.scans
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS scans_insert_owner ON public.scans;
CREATE POLICY scans_insert_owner ON public.scans
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS scans_update_owner ON public.scans;
CREATE POLICY scans_update_owner ON public.scans
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS scans_delete_owner ON public.scans;
CREATE POLICY scans_delete_owner ON public.scans
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Scan Evidence
ALTER TABLE public.scan_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evidence_select_owner ON public.scan_evidence;
CREATE POLICY evidence_select_owner ON public.scan_evidence
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS evidence_insert_owner ON public.scan_evidence;
CREATE POLICY evidence_insert_owner ON public.scan_evidence
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.scans s
            WHERE s.id = scan_evidence.scan_id AND s.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS evidence_update_owner ON public.scan_evidence;
CREATE POLICY evidence_update_owner ON public.scan_evidence
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS evidence_delete_owner ON public.scan_evidence;
CREATE POLICY evidence_delete_owner ON public.scan_evidence
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Scan Explanations
ALTER TABLE public.scan_explanations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS explanations_select_owner ON public.scan_explanations;
CREATE POLICY explanations_select_owner ON public.scan_explanations
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS explanations_insert_owner ON public.scan_explanations;
CREATE POLICY explanations_insert_owner ON public.scan_explanations
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.scans s
            WHERE s.id = scan_explanations.scan_id AND s.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS explanations_update_owner ON public.scan_explanations;
CREATE POLICY explanations_update_owner ON public.scan_explanations
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS explanations_delete_owner ON public.scan_explanations;
CREATE POLICY explanations_delete_owner ON public.scan_explanations
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- User Settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS settings_select_owner ON public.user_settings;
CREATE POLICY settings_select_owner ON public.user_settings
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS settings_insert_owner ON public.user_settings;
CREATE POLICY settings_insert_owner ON public.user_settings
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS settings_update_owner ON public.user_settings;
CREATE POLICY settings_update_owner ON public.user_settings
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS settings_delete_owner ON public.user_settings;
CREATE POLICY settings_delete_owner ON public.user_settings
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Cases
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cases_select_owner ON public.cases;
CREATE POLICY cases_select_owner ON public.cases
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS cases_insert_owner ON public.cases;
CREATE POLICY cases_insert_owner ON public.cases
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cases_update_owner ON public.cases;
CREATE POLICY cases_update_owner ON public.cases
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cases_delete_owner ON public.cases;
CREATE POLICY cases_delete_owner ON public.cases
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Case Scans Junction
ALTER TABLE public.case_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS case_scans_select_owner ON public.case_scans;
CREATE POLICY case_scans_select_owner ON public.case_scans
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS case_scans_insert_owner ON public.case_scans;
CREATE POLICY case_scans_insert_owner ON public.case_scans
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id = case_scans.case_id AND c.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.scans s
            WHERE s.id = case_scans.scan_id AND s.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS case_scans_delete_owner ON public.case_scans;
CREATE POLICY case_scans_delete_owner ON public.case_scans
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Case Notes
ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS case_notes_select_owner ON public.case_notes;
CREATE POLICY case_notes_select_owner ON public.case_notes
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS case_notes_insert_owner ON public.case_notes;
CREATE POLICY case_notes_insert_owner ON public.case_notes
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id = case_notes.case_id AND c.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS case_notes_update_owner ON public.case_notes;
CREATE POLICY case_notes_update_owner ON public.case_notes
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS case_notes_delete_owner ON public.case_notes;
CREATE POLICY case_notes_delete_owner ON public.case_notes
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Case Events (Append-only audit)
ALTER TABLE public.case_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS case_events_select_owner ON public.case_events;
CREATE POLICY case_events_select_owner ON public.case_events
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS case_events_insert_owner ON public.case_events;
CREATE POLICY case_events_insert_owner ON public.case_events
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.cases c
            WHERE c.id = case_events.case_id AND c.user_id = auth.uid()
        )
    );

-- Tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tags_all_owner ON public.tags;
CREATE POLICY tags_all_owner ON public.tags
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Scan Tags Junction
ALTER TABLE public.scan_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scan_tags_select_owner ON public.scan_tags;
CREATE POLICY scan_tags_select_owner ON public.scan_tags
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS scan_tags_insert_owner ON public.scan_tags;
CREATE POLICY scan_tags_insert_owner ON public.scan_tags
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.scans s WHERE s.id = scan_tags.scan_id AND s.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.tags t WHERE t.id = scan_tags.tag_id AND t.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS scan_tags_delete_owner ON public.scan_tags;
CREATE POLICY scan_tags_delete_owner ON public.scan_tags
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Reputation Checks
ALTER TABLE public.reputation_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reputation_checks_select_policy ON public.reputation_checks;
CREATE POLICY reputation_checks_select_policy ON public.reputation_checks
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS reputation_checks_insert_policy ON public.reputation_checks;
CREATE POLICY reputation_checks_insert_policy ON public.reputation_checks
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.scans s WHERE s.id = reputation_checks.scan_id AND s.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS reputation_checks_delete_policy ON public.reputation_checks;
CREATE POLICY reputation_checks_delete_policy ON public.reputation_checks
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Reputation Cache (Internal Service-Role Only)
ALTER TABLE public.reputation_cache ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies: accessible exclusively by backend service_role key.

-- Email Attachments Metadata
ALTER TABLE public.email_attachments_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_attachments_meta_select_policy ON public.email_attachments_meta;
CREATE POLICY email_attachments_meta_select_policy ON public.email_attachments_meta
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS email_attachments_meta_insert_policy ON public.email_attachments_meta;
CREATE POLICY email_attachments_meta_insert_policy ON public.email_attachments_meta
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.scans s WHERE s.id = email_attachments_meta.scan_id AND s.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS email_attachments_meta_delete_policy ON public.email_attachments_meta;
CREATE POLICY email_attachments_meta_delete_policy ON public.email_attachments_meta
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Batch Jobs
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS batch_jobs_select_policy ON public.batch_jobs;
CREATE POLICY batch_jobs_select_policy ON public.batch_jobs
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS batch_jobs_insert_policy ON public.batch_jobs;
CREATE POLICY batch_jobs_insert_policy ON public.batch_jobs
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS batch_jobs_update_policy ON public.batch_jobs;
CREATE POLICY batch_jobs_update_policy ON public.batch_jobs
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS batch_jobs_delete_policy ON public.batch_jobs;
CREATE POLICY batch_jobs_delete_policy ON public.batch_jobs
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Batch Items
ALTER TABLE public.batch_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS batch_items_select_policy ON public.batch_items;
CREATE POLICY batch_items_select_policy ON public.batch_items
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS batch_items_insert_policy ON public.batch_items;
CREATE POLICY batch_items_insert_policy ON public.batch_items
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.batch_jobs b WHERE b.id = batch_items.batch_id AND b.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS batch_items_update_policy ON public.batch_items;
CREATE POLICY batch_items_update_policy ON public.batch_items
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.batch_jobs b WHERE b.id = batch_items.batch_id AND b.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS batch_items_delete_policy ON public.batch_items;
CREATE POLICY batch_items_delete_policy ON public.batch_items
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 11. RPC FUNCTIONS & STORED PROCEDURES
-- -----------------------------------------------------------------------------

-- 1. Atomic Scan Persistence RPC
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
        client_request_id,
        email_metadata
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
        v_client_request_id,
        payload->'email_metadata'
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

-- 2. Dashboard Risk Distribution Function (Security Invoker)
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

-- 3. Dashboard Scans Over Time Function (Security Invoker)
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

-- 4. Dashboard Top Indicator Categories Function (Security Invoker)
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

-- 5. Data Retention Purge Function (Service-Role Only)
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
