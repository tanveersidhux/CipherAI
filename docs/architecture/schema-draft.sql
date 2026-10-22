-- =============================================================================
-- CIPHER AI: Database Schema Draft (Supabase PostgreSQL)
-- Phase: PHASE_01 (Draft Specification Only - Not to be executed in Phase 01)
-- Version: 1.0.0
-- Date: 2026-10-22
-- =============================================================================

-- Enable pgcrypto / uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. SCANS TABLE (Core MVP)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type TEXT NOT NULL CHECK (owner_type IN ('anonymous_session', 'user')),
    owner_id TEXT NOT NULL,
    scan_type TEXT NOT NULL CHECK (scan_type IN ('url', 'message', 'email', 'batch_item')),
    display_value TEXT NOT NULL,
    input_hash TEXT NOT NULL,
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical', 'inconclusive')),
    confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
    report JSONB NOT NULL,
    engine_version TEXT NOT NULL,
    ai_status TEXT NOT NULL CHECK (ai_status IN ('used', 'fallback_used', 'disabled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL
);

-- Performance and Query Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_scans_owner_created 
    ON public.scans (owner_type, owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scans_input_hash 
    ON public.scans (input_hash);

CREATE INDEX IF NOT EXISTS idx_scans_risk_level 
    ON public.scans (risk_level);

CREATE INDEX IF NOT EXISTS idx_scans_active 
    ON public.scans (created_at DESC) 
    WHERE deleted_at IS NULL;

-- Enable Row-Level Security
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. SCAN_INDICATORS TABLE (MVP Analytics / Normalization)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.scan_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
    indicator_id TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'url_structure', 'domain', 'homoglyph', 'redirect_shortener',
        'credential_lure', 'urgency', 'impersonation', 'payment_request',
        'contact_channel', 'attachment', 'reputation', 'other'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    points INTEGER NOT NULL,
    capped BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_indicators_scan_id 
    ON public.scan_indicators (scan_id);

CREATE INDEX IF NOT EXISTS idx_scan_indicators_summary 
    ON public.scan_indicators (indicator_id, created_at DESC);

ALTER TABLE public.scan_indicators ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. POST-MVP TABLES (DRAFT SPECIFICATION)
-- =============================================================================

-- Profiles table extending Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'analyst', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Investigation Cases
CREATE TABLE IF NOT EXISTS public.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- Join table linking scans to cases
CREATE TABLE IF NOT EXISTS public.case_scans (
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (case_id, scan_id)
);
ALTER TABLE public.case_scans ENABLE ROW LEVEL SECURITY;

-- Case Notes
CREATE TABLE IF NOT EXISTS public.case_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (length(body) <= 5000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;

-- Watchlists for proactive domain monitoring
CREATE TABLE IF NOT EXISTS public.watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_value TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('domain', 'brand_keyword')),
    active BOOLEAN NOT NULL DEFAULT true,
    last_checked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

-- End-user feedback loop
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('false_positive', 'false_negative', 'comment')),
    comment TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- MVP Security Policy Intent:
-- In the MVP, public anon clients cannot read or write to scans directly.
-- The FastAPI backend connects with service_role and executes filtered queries.

-- Post-MVP Policies (Activated when Supabase Auth is enabled):
-- Scans: Users can view their own scans, or anonymous sessions matching their token.
CREATE POLICY user_scans_select ON public.scans
    FOR SELECT
    USING (
        (owner_type = 'user' AND owner_id = auth.uid()::text) OR
        (deleted_at IS NULL AND owner_type = 'anonymous_session')
    );

CREATE POLICY user_scans_delete ON public.scans
    FOR UPDATE
    USING (owner_type = 'user' AND owner_id = auth.uid()::text)
    WITH CHECK (owner_type = 'user' AND owner_id = auth.uid()::text);

-- Cases: Only case owners can access or edit cases
CREATE POLICY user_cases_all ON public.cases
    FOR ALL
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY user_case_notes_all ON public.case_notes
    FOR ALL
    USING (author_id = auth.uid())
    WITH CHECK (author_id = auth.uid());

-- =============================================================================
-- 5. RETENTION & CLEANUP ROUTINE (Draft Stored Procedure)
-- =============================================================================
CREATE OR REPLACE FUNCTION purge_expired_anonymous_scans(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.scans
    WHERE owner_type = 'anonymous_session'
      AND created_at < (now() - (retention_days || ' days')::INTERVAL);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
