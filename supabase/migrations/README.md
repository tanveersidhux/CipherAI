# CIPHER AI — Supabase Database Migrations (Phase 07)

This directory contains versioned SQL migrations for the CIPHER AI threat intelligence platform.

---

## 1. Migration Manifest

| Migration File | Description | Rollback Summary |
| :--- | :--- | :--- |
| `20261022000001_create_scans.sql` | Initial Phase 03 baseline scans table. | `DROP TABLE IF EXISTS public.scans CASCADE;` |
| `20261023000001_phase07_core_tables.sql` | Scans (user-owned), evidence, explanations, and user_settings tables. | `DROP TABLE IF EXISTS public.user_settings, public.scan_explanations, public.scan_evidence CASCADE;` |
| `20261023000002_phase07_cases.sql` | Cases, case_scans junction, case_notes, and case_events timeline. | `DROP TABLE IF EXISTS public.case_events, public.case_notes, public.case_scans, public.cases CASCADE;` |
| `20261023000003_phase07_tags_optional.sql` | Tags and scan_tags junction tables. | `DROP TABLE IF EXISTS public.scan_tags, public.tags CASCADE;` |
| `20261023000004_phase07_rls_policies.sql` | Row-Level Security policies for all tables enforcing user isolation. | `ALTER TABLE ... DISABLE ROW LEVEL SECURITY; DROP POLICY ...` |
| `20261023000005_phase07_analytics_and_functions.sql` | Atomic `persist_scan` RPC, `dashboard_*` aggregates, and `purge_expired_scans`. | `DROP FUNCTION IF EXISTS public.persist_scan, public.dashboard_risk_distribution, public.dashboard_scans_over_time, public.dashboard_top_indicator_categories, public.purge_expired_scans;` |

---

## 2. Applying Migrations

### Via Supabase CLI:
```bash
supabase db push
```

### Via Supabase Web Dashboard:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor**.
3. Execute the migrations in chronological order by filename timestamp.

---

## 3. RLS Verification Checklist

- **`scans`**: Authenticated users can only `SELECT`, `INSERT`, `UPDATE`, `DELETE` rows where `user_id = auth.uid()`.
- **`scan_evidence`** & **`scan_explanations`**: Must belong to `auth.uid()` and link to a parent scan owned by `auth.uid()`.
- **`cases`**, **`case_notes`**, **`case_events`**: Strictly isolated to `auth.uid()`.
- **`case_scans`**: Insert requires both the `case_id` and the `scan_id` to be owned by `auth.uid()`.
- **Anonymous role (`anon`)**: Zero access to all user tables.
- **Service role (`service_role`)**: Permitted exclusively on backend for maintenance tasks.
