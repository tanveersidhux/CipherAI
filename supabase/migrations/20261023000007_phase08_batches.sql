-- ============================================================================
-- Migration: 20261023000007_phase08_batches.sql
-- Description: Phase 08 - Adds batch_jobs and batch_items tables with RLS
-- ============================================================================

-- 1. Table: batch_jobs
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

ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "batch_jobs_select_policy"
  ON public.batch_jobs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "batch_jobs_insert_policy"
  ON public.batch_jobs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "batch_jobs_update_policy"
  ON public.batch_jobs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "batch_jobs_delete_policy"
  ON public.batch_jobs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Table: batch_items
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

ALTER TABLE public.batch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "batch_items_select_policy"
  ON public.batch_items FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "batch_items_insert_policy"
  ON public.batch_items FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.batch_jobs WHERE id = batch_id AND user_id = auth.uid())
  );

CREATE POLICY "batch_items_update_policy"
  ON public.batch_items FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.batch_jobs WHERE id = batch_id AND user_id = auth.uid())
  );

CREATE POLICY "batch_items_delete_policy"
  ON public.batch_items FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
