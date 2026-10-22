-- =============================================================================
-- Migration: 20261023000002_phase07_cases.sql
-- Description: Investigation cases, case-scan attachments, case notes, and audit events
-- Phase: PHASE_07 (Investigation Cases and Collaboration Base)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CASES TABLE
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

CREATE TRIGGER trg_cases_updated_at
    BEFORE UPDATE ON public.cases
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. CASE SCANS (Junction Table)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3. CASE NOTES TABLE
-- -----------------------------------------------------------------------------
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

CREATE TRIGGER trg_case_notes_updated_at
    BEFORE UPDATE ON public.case_notes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. CASE EVENTS (Audit Timeline)
-- -----------------------------------------------------------------------------
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
