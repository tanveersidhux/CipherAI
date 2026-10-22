-- =============================================================================
-- Migration: 20261023000004_phase07_rls_policies.sql
-- Description: Enable and enforce Row-Level Security on all Phase 07 tables
-- Phase: PHASE_07 (Row-Level Security & Access Isolation)
-- =============================================================================

-- =============================================================================
-- 1. SCANS TABLE RLS
-- =============================================================================
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

-- =============================================================================
-- 2. SCAN EVIDENCE TABLE RLS
-- =============================================================================
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

-- =============================================================================
-- 3. SCAN EXPLANATIONS TABLE RLS
-- =============================================================================
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

-- =============================================================================
-- 4. USER SETTINGS TABLE RLS
-- =============================================================================
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

-- =============================================================================
-- 5. CASES TABLE RLS
-- =============================================================================
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

-- =============================================================================
-- 6. CASE SCANS TABLE RLS
-- =============================================================================
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

-- =============================================================================
-- 7. CASE NOTES TABLE RLS
-- =============================================================================
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

-- =============================================================================
-- 8. CASE EVENTS TABLE RLS
-- =============================================================================
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

-- =============================================================================
-- 9. TAGS & SCAN TAGS TABLE RLS
-- =============================================================================
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tags_all_owner ON public.tags;
CREATE POLICY tags_all_owner ON public.tags
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

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
