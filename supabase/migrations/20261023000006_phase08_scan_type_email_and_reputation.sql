-- ============================================================================
-- Migration: 20261023000006_phase08_scan_type_email_and_reputation.sql
-- Description: Phase 08 - Adds 'email' to scan_type check constraint,
-- creates reputation_checks, reputation_cache, and email_attachments_meta tables.
-- ============================================================================

-- 1. Extend scans scan_type to allow 'email' in addition to 'url' and 'message'
DO $$
BEGIN
  -- Drop existing check constraint if present
  ALTER TABLE public.scans DROP CONSTRAINT IF EXISTS scans_scan_type_check;
  -- Re-add constraint with 'email'
  ALTER TABLE public.scans ADD CONSTRAINT scans_scan_type_check
    CHECK (scan_type IN ('url', 'message', 'email'));
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- 2. Add optional email_metadata JSONB column to scans for high-level header digest
ALTER TABLE IF EXISTS public.scans
  ADD COLUMN IF NOT EXISTS email_metadata JSONB DEFAULT NULL;

-- 3. Table: reputation_checks (persisted external threat intelligence lookups)
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

-- Enable RLS on reputation_checks
ALTER TABLE public.reputation_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reputation_checks_select_policy"
  ON public.reputation_checks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "reputation_checks_insert_policy"
  ON public.reputation_checks FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.scans WHERE id = scan_id AND user_id = auth.uid())
  );

CREATE POLICY "reputation_checks_delete_policy"
  ON public.reputation_checks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Table: reputation_cache (shared cache across scans, zero personal data)
CREATE TABLE IF NOT EXISTS public.reputation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE, -- SHA-256 of normalized_url + provider
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  categories TEXT[] NOT NULL DEFAULT '{}',
  summary TEXT NOT NULL DEFAULT '',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reputation_cache_expires_at
  ON public.reputation_cache (expires_at);

-- Enable RLS with NO policies for anon/authenticated (accessible only via service role)
ALTER TABLE public.reputation_cache ENABLE ROW LEVEL SECURITY;

-- 5. Table: email_attachments_meta (safe attachment forensic metadata, never binaries)
CREATE TABLE IF NOT EXISTS public.email_attachments_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  sha256 TEXT NOT NULL,
  risky_extension BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_scan_id
  ON public.email_attachments_meta (scan_id);

ALTER TABLE public.email_attachments_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_attachments_meta_select_policy"
  ON public.email_attachments_meta FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "email_attachments_meta_insert_policy"
  ON public.email_attachments_meta FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.scans WHERE id = scan_id AND user_id = auth.uid())
  );

CREATE POLICY "email_attachments_meta_delete_policy"
  ON public.email_attachments_meta FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
