# CIPHER AI — Phase 07 Engineering Notes

**Phase:** `PHASE_07` — Database Persistence, Dashboard Analytics, Scan History, Investigation Cases, Case Notes, and Productivity Features  
**Date:** October 2026  

---

## 1. Repository Inspection Findings

1. **Repository Layout:**
   - Backend is located in `api/` (FastAPI + Pydantic v2 + Pytest).
   - Frontend is located in `web/` (React 19 + Vite + TypeScript + Tailwind + shadcn/ui).
   - Supabase configuration and initial migration exist in `supabase/` (`20261022000001_create_scans.sql`).

2. **Backend Authentication & Data Access Patterns:**
   - `Settings` in `api/app/core/config.py` provides `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_JWT_SECRET`.
   - In Phase 07, `SUPABASE_ANON_KEY` and `SCAN_RETENTION_DAYS` (default 90) are added.
   - For backend authentication, `PyJWT` verifies Supabase HS256/RS256 JWT tokens with signature, expiry (`exp`), audience (`aud="authenticated"`), and issuer verification.
   - For offline test suite independence and local dev, repository interfaces (`ScanRepository`, `CaseRepository`, `NoteRepository`, `AnalyticsRepository`) are implemented with high-fidelity in-memory fakes in `api/app/repositories/fakes.py`, while production database migrations enforce PostgreSQL RLS policies.

3. **Backward Compatibility Guarantee (Phases 04-06):**
   - Existing endpoints `POST /api/v1/scan/url`, `POST /api/v1/scan/message`, and `/scans/*` maintain 100% backward compatibility.
   - For unauthenticated users (guests), the scan completes normally, returning `persistence_status: "not_saved_guest"` and `scan_id: null`.
   - For authenticated users (via `Authorization: Bearer <token>`), the scan persists to user storage, returning `persistence_status: "saved"`, `scan_id: "<uuid>"`, and `saved_at: "<timestamp>"`.
   - If persistence fails (e.g. database glitch), the scan result is still returned safely to the user with `persistence_status: "save_failed"`.

---

## 2. Privacy & Data Minimization Architecture

- **Message Scans:** By default, scam message bodies are redacted (phone numbers, email addresses, and long digit strings are masked) and truncated to a maximum of 500 characters. A SHA-256 hash of the normalized input is stored for de-duplication. Full text is only retained if the user opts in via `user_settings`.
- **URL Scans:** URLs are normalized, stripped of embedded credentials (`user:pass@`) and URL fragments, and stored safely. Scanned URLs are never fetched by the backend in this phase.
- **Untrusted Display:** All user-supplied text (URLs, messages, notes, titles, tags) is rendered as inert plain text in the UI (no `dangerouslySetInnerHTML`). URLs are displayed defanged (e.g. `hxxps://example[.]com`) and never rendered as clickable links.

---

## 3. Database Schema & RLS Architecture

- **`scans`**: Primary scan record tied to `user_id uuid references auth.users(id) on delete cascade`.
- **`scan_evidence`**: Granular indicator findings denormalized with `user_id` for efficient RLS indexing.
- **`scan_explanations`**: Stored AI or fallback explanations.
- **`cases`**: Investigation dossiers with title, description, status (`open`, `in_progress`, `resolved`, `archived`), and priority (`low`, `medium`, `high`).
- **`case_scans`**: Many-to-many junction joining cases and scans, enforcing same-user ownership.
- **`case_notes`**: Timestamped investigation notes (max 5,000 characters).
- **`case_events`**: Audit timeline tracking note additions, status changes, and scan attachments.
- **`tags` & `scan_tags`**: User-scoped scan categorization tags.
- **`user_settings`**: Per-user retention and message storage preference.

Every table enables Row-Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) with `USING (user_id = auth.uid())` and `WITH CHECK (user_id = auth.uid())`.
