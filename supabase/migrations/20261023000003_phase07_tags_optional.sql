-- =============================================================================
-- Migration: 20261023000003_phase07_tags_optional.sql
-- Description: User-scoped tags and scan-tag associations
-- Phase: PHASE_07 (Productivity Features: Tags)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TAGS TABLE
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

-- -----------------------------------------------------------------------------
-- 2. SCAN TAGS (Junction Table)
-- -----------------------------------------------------------------------------
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
