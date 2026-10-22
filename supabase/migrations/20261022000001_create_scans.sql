-- =============================================================================
-- Migration: 20261022000001_create_scans.sql
-- Description: Creates the core scans table with Row-Level Security (RLS) enabled
-- Phase: PHASE_03 (FastAPI setup and database initialization)
-- =============================================================================

-- Enable pgcrypto extension for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. SCANS TABLE
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

-- =============================================================================
-- 2. INDEXES
-- =============================================================================
-- Composite index for fast session and user history listing ordered by recency
CREATE INDEX IF NOT EXISTS idx_scans_owner_created
    ON public.scans (owner_type, owner_id, created_at DESC);

-- Index for deterministic cache lookups by input hash
CREATE INDEX IF NOT EXISTS idx_scans_input_hash
    ON public.scans (input_hash);

-- Index for dashboard analytics filtering by risk level
CREATE INDEX IF NOT EXISTS idx_scans_risk_level
    ON public.scans (risk_level);

-- Partial index for active non-deleted scans
CREATE INDEX IF NOT EXISTS idx_scans_active
    ON public.scans (created_at DESC)
    WHERE deleted_at IS NULL;

-- =============================================================================
-- 3. ROW-LEVEL SECURITY (RLS) POLICY ENFORCEMENT
-- =============================================================================
-- Enable Row-Level Security on the scans table
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- IMPORTANT SECURITY DESIGN INVARIANT (PHASE 03):
-- At this stage, NO public access policies are granted to the `anon` or `authenticated`
-- roles. Direct client-side access from Supabase JS/PostgREST is strictly denied by default.
--
-- Access model:
-- 1. The FastAPI backend connects exclusively using the backend `service_role` key,
--    which safely bypasses RLS to perform persistence and session-ownership validation.
-- 2. In Phase 07, user-scoped RLS policies utilizing `auth.uid()` and session validation
--    will be introduced when Supabase Auth and User accounts are wired.
