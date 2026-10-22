# CIPHER AI — Row-Level Security (RLS) & Multi-Tenant Audit

| Metadata | Details |
| :--- | :--- |
| **Title** | Supabase Row-Level Security Audit Report |
| **Phase** | PHASE_09: Hardening, Threat Model, Privacy Review, and Final Verification |
| **Status** | Verified & Approved |
| **Execution Date** | 2026-10-23 |
| **Audit Script** | [`scripts/audit_rls.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/scripts/audit_rls.py) |
| **Test Suite** | [`api/tests/authz/test_idor.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/tests/authz/test_idor.py) |

---

## 1. Executive Summary

All persistent application tables within the CIPHER AI PostgreSQL database schema have Row-Level Security (`ENABLE ROW LEVEL SECURITY`) activated with zero exceptions. Access control is strictly mediated via Supabase Auth JSON Web Tokens, enforcing that authenticated users (`auth.uid()`) can only query, insert, mutate, or purge database entities matching their verified cryptographic subject identifier.

The automated verification tool `python scripts/audit_rls.py` and the integration IDOR test suite `pytest tests/authz/test_idor.py` confirm 100% tenant isolation across all primary entities: scans, evidence items, explanations, investigation cases, case notes, audit timeline events, tags, and asynchronous batch scan jobs.

---

## 2. Table Security & Policy Inventory

| Schema & Table | RLS Status | Policy Count | Operations Permitted | Isolation Clause | Audit Result |
| :--- | :--- | :---: | :--- | :--- | :---: |
| `public.scans` | **ENABLED** | 4 | SELECT, INSERT, UPDATE, DELETE | `user_id = auth.uid()` | **PASS** |
| `public.scan_evidence` | **ENABLED** | 4 | SELECT, INSERT, UPDATE, DELETE | `user_id = auth.uid() AND EXISTS (SELECT 1 FROM scans s WHERE s.id = scan_id AND s.user_id = auth.uid())` | **PASS** |
| `public.scan_explanations` | **ENABLED** | 4 | SELECT, INSERT, UPDATE, DELETE | `user_id = auth.uid()` | **PASS** |
| `public.cases` | **ENABLED** | 4 | SELECT, INSERT, UPDATE, DELETE | `user_id = auth.uid()` | **PASS** |
| `public.case_scans` | **ENABLED** | 3 | SELECT, INSERT, DELETE | `user_id = auth.uid() AND EXISTS (SELECT 1 FROM cases c WHERE c.id = case_id AND c.user_id = auth.uid())` | **PASS** |
| `public.case_notes` | **ENABLED** | 4 | SELECT, INSERT, UPDATE, DELETE | `user_id = auth.uid() AND EXISTS (SELECT 1 FROM cases c WHERE c.id = case_id AND c.user_id = auth.uid())` | **PASS** |
| `public.case_events` | **ENABLED** | 2 | SELECT, INSERT *(Immutable)* | `user_id = auth.uid() AND EXISTS (SELECT 1 FROM cases c WHERE c.id = case_id AND c.user_id = auth.uid())` | **PASS** |
| `public.tags` | **ENABLED** | 1 | ALL (SELECT, INSERT, UPDATE, DELETE) | `user_id = auth.uid()` | **PASS** |
| `public.scan_tags` | **ENABLED** | 3 | SELECT, INSERT, DELETE | `user_id = auth.uid()` | **PASS** |
| `public.batch_jobs` | **ENABLED** | 4 | SELECT, INSERT, UPDATE, DELETE | `user_id = auth.uid()` | **PASS** |
| `public.batch_items` | **ENABLED** | 4 | SELECT, INSERT, UPDATE, DELETE | `user_id = auth.uid() AND EXISTS (SELECT 1 FROM batch_jobs b WHERE b.id = batch_id AND b.user_id = auth.uid())` | **PASS** |

---

## 3. Defense-in-Depth Measures

1. **Anti-Bypass Guardrails:**
   - No policy contains unconditional permissive clauses (`USING (true)` or `WITH CHECK (true)`).
   - Foreign key cascading deletes (`ON DELETE CASCADE`) are bounded by tenant ownership checks to prevent unauthorized cascading side-effects.
2. **Audit Event Immutability:**
   - `public.case_events` implements write-once semantics: policies only exist for `SELECT` and `INSERT`. Attempts to `UPDATE` or `DELETE` timeline records fail automatically under PostgreSQL security rules.
3. **Application-Level Pre-Flight Checks:**
   - Even if RLS were bypassed via administrator elevation, all repository operations in [`app/repositories/fakes.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/repositories/fakes.py) and backend services enforce explicit `user_id` filtering as a second line of defense.
