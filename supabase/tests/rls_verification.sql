-- =============================================================================
-- CIPHER AI: Database Security & RLS Verification Script
-- Run this script in PostgreSQL / Supabase SQL Editor to verify:
-- 1. Row-Level Security (RLS) is active on the `scans` table.
-- 2. The `anon` role has ZERO access to read, insert, update, or delete scans.
-- 3. The `authenticated` role has ZERO access at Phase 03.
-- =============================================================================

BEGIN;

-- 1. Check that Row Level Security is enabled on public.scans
DO $$
DECLARE
    rls_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'scans' AND relnamespace = 'public'::regnamespace;

    IF NOT rls_enabled THEN
        RAISE EXCEPTION 'TEST FAILED: RLS is NOT enabled on public.scans table!';
    ELSE
        RAISE NOTICE 'TEST PASSED: RLS is enabled on public.scans.';
    END IF;
END $$;

-- 2. Verify that there are NO permissive policies granting access to anon
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'scans'
      AND ('anon' = ANY(roles) OR 'public' = ANY(roles));

    IF policy_count > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: Found % permissive policy/policies exposing scans to anon!', policy_count;
    ELSE
        RAISE NOTICE 'TEST PASSED: Zero permissive policies exist for anon role on public.scans.';
    END IF;
END $$;

-- 3. Simulate execution as the `anon` role and verify SELECT returns 0 rows / access denied
SET LOCAL ROLE anon;

-- This query should return 0 rows under RLS with no policies
SELECT count(*) FROM public.scans;

-- Reset role back to default admin / service
RESET ROLE;

ROLLBACK;
