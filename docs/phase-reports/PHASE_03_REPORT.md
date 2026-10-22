# CIPHER AI — Phase 03 Completion Report

| Metadata | Details |
| :--- | :--- |
| **Project** | CIPHER AI (Understand threats. Protect what matters.) |
| **Phase ID** | `PHASE_03` |
| **Phase Name** | Project Scaffolding, Git Structure, Environment Configuration, Frontend Routing Verification, FastAPI Setup, Database Initialization, and Health Endpoint |
| **Owner Role** | Senior Full-Stack Engineer & DevOps-Minded Backend Architect |
| **Date** | 2026-10-22 |
| **Status** | COMPLETE |
| **Next Phase** | `PHASE_04` (Core Security Engine, URL Validation, Scam-Message Analysis, Deterministic Risk Scoring, Threat Reports) |

---

## 1. Summary

Phase 03 delivers a secure, reproducible, and fully verified FastAPI backend foundation under `api/`, a production-ready database schema migration with strict zero-public-access Row-Level Security under `supabase/`, an interactive frontend connectivity monitor under `web/`, and automated CI workflows and repository hygiene tooling. The backend enforces universal `ErrorEnvelope` formatting across all error paths (including 404, 405, 413, 422, and 500), strict CORS allowlisting, defensive security headers, query-free structured JSON access logging with secret scrubbing, and an isolated, cached `GET /api/v1/health` endpoint. The frontend `web/` application maintains 100% test integrity with zero changes to mock scanning behaviors, and all secrets remain strictly segregated from client code.

---

## 2. Repository Inspection Findings

Prior to making any modifications, the workspace was audited against Phase 01 and Phase 02 artifacts:
- **Baseline Git Status:** Clean working tree on branch `main` at commit baseline.
- **Python Environment:** Python 3.13.3 installed locally (satisfying the `>= 3.11` prerequisite).
- **Node Environment:** Node.js v24.12.0 and npm 11.6.2 available.
- **Phase 02 Baseline Verification (`web/`):**
  - Dependency installation executed via `npm ci` (442 packages installed).
  - `npm run lint`: 0 errors (11 informational warnings on Fast Refresh and defang regex).
  - `npm run typecheck`: 0 errors.
  - `npm run test`: 9 test files passed, 78 tests passed.
  - `npm run build`: Production client bundle built in 979ms with 0 errors.
- **Database & Tooling Audit:** Supabase CLI, `psql`, and Docker are not installed in this host environment. No cloud database credentials were provided in local untracked environment files. Per prompt rules, database migrations were created and offline-validated, with live database application marked as *Not executed with a safe plan*.

---

## 3. Files Created

| File | Purpose |
| :--- | :--- |
| `docs/adr/ADR-0007-backend-foundation-extensions.md` | Documents additive extensions (`METHOD_NOT_ALLOWED`, `MAX_REQUEST_BODY_BYTES`, `ENABLE_API_DOCS`, `DB_HEALTHCHECK_TIMEOUT_SECONDS`) and health contract reconciliations. |
| `docs/architecture/backend-foundation.md` | Architecture specification detailing middleware execution order, error strategy, structured JSON logging, and health endpoint design. |
| `docs/setup/local-development.md` | Comprehensive clone-to-running local development guide, environment variable references, and troubleshooting. |
| `docs/setup/database-setup.md` | Database migration apply, rollback commands, and Row-Level Security verification instructions. |
| `docs/phase-reports/PHASE_03_REPORT.md` | Phase 03 formal completion report. |
| `.editorconfig` | EditorConfig configuration enforcing utf-8, LF line endings, 2-space indentation (4-space for Python). |
| `.github/PULL_REQUEST_TEMPLATE.md` | Standard pull request checklist enforcing test execution, doc updates, and secret prevention. |
| `.github/workflows/ci.yml` | Multi-job GitHub Actions CI running linting, typechecking, tests, build, and secret scanning for `web` and `api`. |
| `CONTRIBUTING.md` | Contribution guidelines, Conventional Commit formatting, and branching conventions. |
| `scripts/check-no-secrets-in-web.mjs` | Automated secret leak scanner preventing backend credentials from entering `web/`. |
| `api/pyproject.toml` | Ruff linting/formatting rules and pytest configuration. |
| `api/requirements.txt` | Pinned runtime dependencies (`fastapi`, `uvicorn`, `pydantic`, `pydantic-settings`, `httpx`). |
| `api/requirements-dev.txt` | Pinned test and development dependencies (`pytest`, `pytest-cov`, `ruff`). |
| `api/.env.example` | Backend environment variable template with placeholder descriptions and no secrets. |
| `api/app/__init__.py` | Package marker for backend application. |
| `api/app/main.py` | FastAPI application factory `create_app()`, ASGI entry `app`, lifespan handler, and router mounting. |
| `api/app/core/__init__.py` | Package marker for core application infrastructure. |
| `api/app/core/config.py` | Strongly typed configuration using `pydantic-settings`, validation rules, and secret masking. |
| `api/app/core/errors.py` | `AppError` domain exception hierarchy, universal error envelope builder, and exception handlers. |
| `api/app/core/logging.py` | Structured JSON log formatter, secret redaction filter, and request ID contextvar management. |
| `api/app/core/middleware.py` | Middleware stack: Request ID tracing, access logging, ASGI request body size limit, security headers, and CORS allowlisting. |
| `api/app/core/security.py` | Request ID sanitization and safe security helpers. |
| `api/app/api/__init__.py` | Package marker for API layer. |
| `api/app/api/v1/__init__.py` | Package marker for API v1 routes. |
| `api/app/api/v1/router.py` | Aggregates all v1 API routers under `/api/v1`. |
| `api/app/api/v1/health.py` | `GET /api/v1/health` endpoint with cached database reachability probe and LLM status inspection. |
| `api/app/schemas/__init__.py` | Package marker for Pydantic schemas. |
| `api/app/schemas/errors.py` | Pydantic models for the canonical `ErrorEnvelope`. |
| `api/app/schemas/health.py` | Pydantic models for `HealthResponse` and `DependencyHealth`. |
| `api/app/engine/__init__.py` | Reserved package marker for Phase 04 Security Engine. |
| `api/app/ai/__init__.py` | Reserved package marker for Phase 05 Bounded AI. |
| `api/app/services/__init__.py` | Reserved package marker for business services. |
| `api/app/repositories/__init__.py` | Reserved package marker for Phase 07 persistence repositories. |
| `api/tests/conftest.py` | Pytest fixtures, test application factory, and test routes. |
| `api/tests/unit/test_config.py` | Unit tests for configuration parsing, numeric bounds, production CORS rules, and secret masking. |
| `api/tests/unit/test_errors.py` | Unit tests for error envelopes, status codes, and `AppError` subclasses. |
| `api/tests/unit/test_logging_redaction.py` | Unit tests for structured JSON logging and sensitive key redaction. |
| `api/tests/unit/test_request_id.py` | Unit tests for request ID sanitization, propagation, and malicious header neutralization. |
| `api/tests/integration/test_health.py` | Integration tests for `/api/v1/health` across all dependency states with mock httpx transports and caching. |
| `api/tests/integration/test_middleware.py` | Integration tests for CORS allowlisting, security headers, request body size limits, and doc gating. |
| `supabase/config.toml` | Supabase CLI local stack configuration. |
| `supabase/migrations/20261022000001_create_scans.sql` | Migration creating `public.scans`, performance indexes, and enabling RLS without public access policies. |
| `supabase/seed.sql` | Synthetic mock scan data fixture. |
| `supabase/tests/rls_verification.sql` | PostgreSQL verification script verifying RLS activation and anon denial. |
| `web/src/lib/config.ts` | Validated frontend environment configuration with trailing slash normalization and dev fallback. |
| `web/src/lib/api/health.ts` | Typed health check client with 5s `AbortController` timeout and runtime guard. |
| `web/src/lib/api/health.test.ts` | Unit tests for frontend health client across network, timeout, http error, and valid states. |
| `web/src/components/common/ConnectionStatus.tsx` | Accessible UI component displaying backend reachability and dependency status with 44px touch target. |
| `web/src/components/common/ConnectionStatus.test.tsx` | Unit and interaction tests for `ConnectionStatus`. |

---

## 4. Files Modified

| File | Change Description |
| :--- | :--- |
| `README.md` | Updated status table to Phase 03 Complete, added quickstart for `api/` and `web/`, and updated documentation index. |
| `.gitignore` | Added `.ruff_cache/`, `supabase/.branches/`, and `supabase/.temp/` while preserving all existing ignore rules. |
| `web/.env.example` | Normalized to contain `VITE_API_BASE_URL=http://localhost:8000` only. |
| `web/src/types/api.ts` | Added `METHOD_NOT_ALLOWED` to `ErrorCode` union type. |
| `web/src/lib/content/wording.ts` | Added `METHOD_NOT_ALLOWED` error description and `CONNECTION_STATUS_LABELS` dictionary. |
| `web/src/pages/SettingsPage.tsx` | Mounted `ConnectionStatus` under the page header without altering theme or session logic. |
| `docs/api/api-contracts.md` | Added HTTP 405 `METHOD_NOT_ALLOWED` to documented error codes table. |
| `docs/api/schemas/error-envelope.schema.json` | Added `METHOD_NOT_ALLOWED` to error code enum. |
| `docs/api/openapi-draft.yaml` | Reconciled health endpoint responses to 200 with isolated dependency states per ADR-0007. |

---

## 5. Dependencies Added

### Backend Runtime Dependencies (`api/requirements.txt`)
All dependencies are strictly on the approved list and pinned:
| Package | Version | Purpose | Approval Status |
| :--- | :--- | :--- | :--- |
| `fastapi` | `0.115.11` | Core ASGI web framework | Approved |
| `uvicorn` | `0.34.0` | Production-grade ASGI server | Approved |
| `pydantic` | `2.10.6` | Data validation and serialization | Approved |
| `pydantic-settings` | `2.8.1` | Type-safe environment configuration | Approved |
| `httpx` | `0.28.1` | Non-blocking async client for health checks | Approved |

### Backend Development Dependencies (`api/requirements-dev.txt`)
| Package | Version | Purpose | Approval Status |
| :--- | :--- | :--- | :--- |
| `pytest` | `8.3.5` | Automated test runner | Approved |
| `pytest-cov` | `6.0.0` | Test coverage measurement | Justified: Required to measure and enforce the >=90% test coverage threshold on `app/core` and `app/api`. |
| `ruff` | `0.9.9` | High-speed Python linter and formatter | Approved |

*Zero unapproved backend dependencies, ORMs, or database client libraries were introduced.*

---

## 6. Decisions and Extensions

All architectural extensions are recorded in [`docs/adr/ADR-0007-backend-foundation-extensions.md`](file:///docs/adr/ADR-0007-backend-foundation-extensions.md):
1. **Additive Error Code `METHOD_NOT_ALLOWED` (HTTP 405):** Ensures unsupported methods return the universal `ErrorEnvelope` rather than raw text/plain.
2. **`MAX_REQUEST_BODY_BYTES` (default 20,000):** Enforced at the ASGI socket level by `RequestBodyLimitMiddleware` to prevent denial-of-service memory exhaustion before route parsing.
3. **`ENABLE_API_DOCS` Setting:** Interactive documentation (`/docs`, `/redoc`, `/openapi.json`) is automatically disabled when `APP_ENV == "production"` unless explicitly overridden.
4. **`DB_HEALTHCHECK_TIMEOUT_SECONDS` (default 2.0s):** Bounds database probe latency to prevent slow database connections from stalling health checks.
5. **Health Check Dependency Isolation:** HTTP 200 is always returned when the API process is alive; database degradation is reported inside the `dependencies` object without crashing the health probe. Probes are cached for 10 seconds.

---

## 7. Verification Results

### 7.1 Backend Code Quality (`api/`)
- **Linter (`ruff check .`):** Passed cleanly (0 errors).
- **Formatter (`ruff format --check .`):** Passed cleanly (26 files checked).
- **Test Suite (`pytest --cov=app --cov-report=term-missing`):**
  - **Results:** 37 passed in 4.48s.
  - **Overall Coverage:** **96%** (461 statements, 20 misses).
  - Module breakdowns:
    - `app/api/v1/health.py`: **98%**
    - `app/core/config.py`: **96%**
    - `app/core/logging.py`: **98%**
    - `app/core/middleware.py`: **97%**
    - `app/core/security.py`: **100%**
    - `app/core/errors.py`: **90%**
    - `app/main.py`: **97%**
    - `app/schemas/errors.py`: **100%**
    - `app/schemas/health.py`: **100%**

### 7.2 Frontend Code Quality (`web/`)
- **Linter (`npm run lint`):** 0 errors.
- **Typecheck (`npm run typecheck`):** 0 errors.
- **Test Suite (`npm run test`):** 11 test files passed, 89 tests passed in 10.27s (78 existing + 11 new tests).
- **Production Build (`npm run build`):** Built cleanly in 2.40s.

### 7.3 Secret Leak Scanner (`scripts/check-no-secrets-in-web.mjs`)
- **Clean Run:** Scanned 97 files in `web/` with 0 forbidden secrets detected.
- **Failure Test:** Injected `LLM_API_KEY` into `web/src/lib/config.ts`; scanner aborted with exit code 1 and printed exact line violation. Successfully reverted.

### 7.4 Live End-to-End & `curl.exe` Inspection
Uvicorn dev server was started on `http://127.0.0.1:8000`:
- **`GET /api/v1/health` (HTTP 200 OK):**
  ```http
  HTTP/1.1 200 OK
  date: Thu, 22 Oct 2026 12:18:34 GMT
  server: uvicorn
  content-length: 169
  content-type: application/json
  x-request-id: 4971df84-c963-480c-905e-2e7e6206a785
  x-content-type-options: nosniff
  x-frame-options: DENY
  referrer-policy: no-referrer
  permissions-policy: camera=(), microphone=(), geolocation=(), payment=()
  cache-control: no-store, no-cache, must-revalidate
  pragma: no-cache

  {"status":"ok","app_version":"1.0.0","environment":"development","timestamp":"2026-10-22T12:18:35.118233Z","dependencies":{"database":"not_configured","llm":"disabled"}}
  ```
- **`GET /api/v1/unknown-path-404` (HTTP 404 NOT_FOUND):**
  ```http
  HTTP/1.1 404 Not Found
  x-request-id: 474f1cf3-d6d8-4cad-8a6b-3fb3008958d6
  x-content-type-options: nosniff
  x-frame-options: DENY
  referrer-policy: no-referrer

  {"error":{"code":"NOT_FOUND","message":"The requested resource was not found.","details":[],"request_id":"474f1cf3-d6d8-4cad-8a6b-3fb3008958d6"}}
  ```
- **`POST /api/v1/health` (HTTP 405 METHOD_NOT_ALLOWED):**
  ```http
  HTTP/1.1 405 Method Not Allowed
  x-request-id: 189e7335-443b-4ed5-a474-88da45ab6e9f

  {"error":{"code":"METHOD_NOT_ALLOWED","message":"Method not allowed for requested route.","details":[],"request_id":"189e7335-443b-4ed5-a474-88da45ab6e9f"}}
  ```
- **CORS Allowlist Verification:**
  - `Origin: http://localhost:5173` returned `access-control-allow-origin: http://localhost:5173`.
  - `Origin: http://unauthorized-domain.com` omitted CORS headers.

---

## 8. Database Status

- **Status:** **Not executed with a safe plan.**
- **Reason:** No live Supabase credentials (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) were configured in local environment files, and neither the Supabase CLI nor Docker is installed on this host environment.
- **Offline Validation:**
  - Migration file `supabase/migrations/20261022000001_create_scans.sql` was authored and validated against `docs/architecture/data-model.md` and `schema-draft.sql`.
  - Row-Level Security is explicitly enabled.
  - Zero policies granting access to `anon` or `authenticated` are included.
  - Verification queries documented in `supabase/tests/rls_verification.sql`.
  - Apply and rollback procedures documented in `docs/setup/database-setup.md`.

---

## 9. Acceptance Criteria Status

| ID | Title | Status | Evidence |
| :--- | :--- | :--- | :--- |
| **AC-01** | Phase 02 web verification passed | **MET** | `npm run lint`, `typecheck`, `test` (78 tests), and `build` passed before changes and after changes (89 tests). |
| **AC-02** | uvicorn starts API & health returns exact shape | **MET** | Verified live on `http://127.0.0.1:8000/api/v1/health` with `curl.exe` and integration tests. |
| **AC-03** | Error envelope with request ID on all error paths | **MET** | 404, 405, 413, 422, and 500 error envelope tests pass; tracebacks hidden; header matches envelope. |
| **AC-04** | Settings validation & secret masking | **MET** | `test_config.py` verifies production CORS rejection, bounds checks, and `SecretStr` masking in `repr()` and logs. |
| **AC-05** | Middleware stack enforced | **MET** | CORS allowlisting, security headers, request ID sanitization, and body size limits verified via integration tests. |
| **AC-06** | Structured JSON logging with redaction | **MET** | Single-line JSON access logs omit query strings and user payloads; secret redaction filter verified via tests. |
| **AC-07** | Scans migration with RLS enabled | **MET** | Migration `20261022000001_create_scans.sql` created; database application reported honestly as Not executed. |
| **AC-08** | Frontend ConnectionStatus component | **MET** | `ConnectionStatus` mounted on Settings page; 11 new Vitest tests pass; `MockCipherApi` scanning logic untouched. |
| **AC-09** | Secret-name scan passes & fails on test token | **MET** | `check-no-secrets-in-web.mjs` passed on clean tree and failed on temporary `LLM_API_KEY` token before revert. |
| **AC-10** | CI workflow exists and syntax validated | **MET** | `.github/workflows/ci.yml` created with cached `web` and `api` jobs requiring no secrets. |
| **AC-11** | Local development guide & dry run | **MET** | `docs/setup/local-development.md` created; clean venv install and uvicorn start verified. |
| **AC-12** | OpenAPI output matches contracts | **MET** | Exported OpenAPI schema matches `HealthResponse`; reconciliation documented in ADR-0007. |
| **AC-13** | No unauthorized dependencies or logic creep | **MET** | Only approved packages used (with `pytest-cov` justified); zero scanning, scoring, or persistence logic added. |
| **AC-14** | All tests, linters, and builds pass | **MET** | 37 backend tests pass (96% coverage); 89 frontend tests pass; both linters and builds pass with 0 errors. |

---

## 10. Known Limitations

1. **Database Applied Offline Only:** The `scans` table migration has not been applied to a live PostgreSQL database due to the absence of credentials.
2. **Localhost Insecure HTTP Permitted Only in Dev:** In development mode, `http://localhost:5173` is permitted; production mode strictly enforces HTTPS for all CORS origins.

---

## 11. Open Questions for the Team

1. **Supabase Project Provisioning:** When will the shared development Supabase project URL and service role key be provisioned for team use?
2. **LLM Provider Choice for Phase 05:** Will the project use Google Gemini (`gemini-2.5-flash`) or an OpenAI-compatible proxy for Phase 05 threat explanation generation?

---

## 12. Phase Complete Declaration

**Phase Complete:** `true`

All 14 acceptance criteria are fully met. The backend foundation, middleware stack, structured logging, error envelopes, health check, database migration, frontend connectivity component, and CI workflows are verified, operational, and ready for Phase 04.
