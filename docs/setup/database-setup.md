# CIPHER AI: Database Setup & Migration Guide

| Metadata | Details |
| :--- | :--- |
| **Project** | CIPHER AI (Understand threats. Protect what matters.) |
| **Document** | Database Initialization, Migration Management, and RLS Verification |
| **Phase** | PHASE_03: FastAPI Setup, Database Initialization, and Health Endpoint |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |

---

## 1. Overview

CIPHER AI uses **Supabase (PostgreSQL 15+)** for threat report persistence, anonymous scan history, and dashboard metrics.

In **Phase 03**, the database architecture enforces two core security invariants:
1. **Minimal MVP Scope:** Only the primary `public.scans` table and its indexes are created. Post-MVP tables (`profiles`, `cases`, `case_scans`, `watchlists`) from `schema-draft.sql` are strictly deferred.
2. **Strict Zero-Access Row-Level Security (RLS):** RLS is enabled on `public.scans`, with **ZERO** permissive policies granted to the `anon` or `authenticated` roles. Direct PostgREST/client access is blocked. The backend connects exclusively via the privileged `service_role` key, with ownership validation enforced in application logic (Phase 07).

---

## 2. Directory Layout

```
supabase/
├── config.toml                              # Supabase CLI local stack configuration
├── seed.sql                                 # Synthetic test data fixture
├── migrations/
│   └── 20261022000001_create_scans.sql      # Core scans table, indexes, and RLS
└── tests/
    └── rls_verification.sql                 # Security audit and RLS verification script
```

---

## 3. Applying Migrations

### Option A: Using the Supabase Dashboard SQL Editor (Cloud Project)
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project and open the **SQL Editor**.
3. Copy the contents of `supabase/migrations/20261022000001_create_scans.sql` and click **Run**.
4. (Optional) Run `supabase/seed.sql` to insert synthetic sample threat reports.

### Option B: Using the Supabase CLI (Local or Linked Project)
```bash
# Start local Supabase container stack (requires Docker)
supabase start

# Apply pending migrations
supabase db push

# Reset database and apply migrations + seed data
supabase db reset
```

### Option C: Using Standard `psql`
```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" \
  -f supabase/migrations/20261022000001_create_scans.sql
```

---

## 4. Rollback (Down Migration)

To revert the Phase 03 migration and drop the scans table:

```sql
-- Rollback Script for 20261022000001_create_scans.sql
DROP TABLE IF EXISTS public.scans CASCADE;
```

---

## 5. Security & Row-Level Security (RLS) Verification

To verify that Row-Level Security is properly configured and that the public `anon` role cannot access any user scans, run the audit script:

```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" \
  -f supabase/tests/rls_verification.sql
```

### Expected Output
```
NOTICE:  TEST PASSED: RLS is enabled on public.scans.
NOTICE:  TEST PASSED: Zero permissive policies exist for anon role on public.scans.
 count 
-------
     0
(1 row)
```

---

## 6. Offline / Not Executed Plan

If no live Supabase credentials or local Docker environment were provided during Phase 03 setup:
- The migration file has been fully validated for syntax and relational integrity against `docs/architecture/data-model.md`.
- The FastAPI backend gracefully detects the absence of `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` and reports `database: not_configured` on `/api/v1/health` without crashing.
- When credentials become available, follow Option A or Option B above to apply migration `20261022000001_create_scans.sql`.
