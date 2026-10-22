# ADR-0007: Backend Foundation Architecture Extensions and Reconciliations

| Metadata | Details |
| :--- | :--- |
| **Title** | ADR-0007: Backend Foundation Architecture Extensions and Reconciliations |
| **Phase** | PHASE_03: Project Scaffolding, Git Structure, Environment Configuration, Frontend Routing Verification, FastAPI Setup, Database Initialization, and Health Endpoint |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior Full-Stack Engineer & DevOps-Minded Backend Architect |

---

## 1. Context

During the implementation of Phase 03 (FastAPI backend foundation, middleware stack, structured logging, typed configuration, and health check), several operational and architectural edge cases were identified that required additive extensions to the Phase 01 specifications:

1. **HTTP 405 Method Handling:** When a client issues an unsupported HTTP method against a route (e.g. `POST /api/v1/health`), Starlette / FastAPI default handlers emit a plain text or unstandardized JSON payload. The CIPHER AI architecture requires that **every non-2xx response** without exception conform to the canonical `ErrorEnvelope` schema `{ error: { code, message, details, request_id } }`. The Phase 01 error code catalog did not include an explicit code for HTTP 405.
2. **Defensive ASGI Request Body Size Limiting:** Phase 01 defined max character lengths for URLs (2048) and messages (5000), but did not provide a protocol-level defense against oversized raw HTTP request bodies (such as streaming gigabytes into memory before validation).
3. **API Documentation Surface Control:** Phase 01 specifications noted that API docs should not leak attack surface in production environments. An explicit configuration setting was needed to toggle interactive documentation (`/docs`, `/redoc`, `/openapi.json`).
4. **Resilient Database Health Check Timeout:** The health endpoint checks Supabase REST reachability. If the database experiences a network brownout, unconstrained health requests could exhaust ASGI worker threads. An explicit timeout configuration was needed.
5. **Path Normalization for Health Endpoint:** Phase 01 OpenAPI draft placed `/health` directly under the server URL `http://localhost:8000/api/v1`, effectively mapping to `/api/v1/health`. This document formally codifies `/api/v1/health` as the canonical health path, with the root `/` path returning a minimal non-sensitive pointer.

## 2. Decision

We approve the following additive extensions and reconciliations to the CIPHER AI architecture:

### 2.1 Additive Error Code: `METHOD_NOT_ALLOWED`
- **Code:** `METHOD_NOT_ALLOWED`
- **HTTP Status:** `405 Method Not Allowed`
- **Behavior:** Registered in `api/app/core/errors.py` as `MethodNotAllowedError` and handled in Starlette exception overrides.
- **Contract Update:** Added to `docs/api/api-contracts.md` and `docs/api/schemas/error-envelope.schema.json`.

### 2.2 Additive Typed Configuration Settings
We add four configuration fields to `api/app/core/config.py` using `pydantic-settings`:
1. `MAX_REQUEST_BODY_BYTES`: Integer, default `20000` (20 KB). Enforced by ASGI middleware `RequestBodyLimitMiddleware`. Rejects requests exceeding this byte count with HTTP 413 `INPUT_TOO_LARGE`.
2. `ENABLE_API_DOCS`: Boolean, default `False` when `APP_ENV == "production"`, `True` otherwise. Toggles FastAPI's `/docs`, `/redoc`, and `/openapi.json`.
3. `DB_HEALTHCHECK_TIMEOUT_SECONDS`: Float, default `2.0` seconds. Bound between 0.5 and 10.0 seconds. Restricts httpx client timeout when probing database health.
4. Response caching on `/api/v1/health` database probe: 10-second TTL in-memory cache to prevent denial-of-service / hammering on downstream Supabase infrastructure during high-frequency health probes.

### 2.3 Health Endpoint Contract Reconciliation
- Path: `GET /api/v1/health`
- Response status: HTTP 200 if the FastAPI application process is up and serving.
- Degraded dependencies (e.g. `database: unavailable`, `llm: not_configured`) do not turn the HTTP status into 503; dependency states are isolated under `dependencies`:
  - `database`: `"ok" | "unavailable" | "not_configured"`
  - `llm`: `"enabled" | "disabled" | "not_configured"`
- LLM is never invoked during a health check.
- Secrets, database credentials, internal traces, and internal URLs are never reflected in the response.

## 3. Consequences

### Positive
- Strict adherence to the universal error envelope across all HTTP status codes, including 404, 405, 413, 422, and 500.
- Protection against memory exhaustion attacks before request payloads reach application route handlers.
- Safe-by-default production deployments where API schema docs are hidden unless deliberately enabled.
- Deterministic, non-blocking health checks that cannot cascade database degradation into API process termination.

### Negative / Tradeoffs
- Phase 01 documentation artifacts (`docs/api/api-contracts.md`, `docs/api/schemas/error-envelope.schema.json`, `docs/api/openapi-draft.yaml`) must be updated to maintain single-source-of-truth consistency.

## 4. Alternatives Considered

- **Allowing standard FastAPI 405 responses:** Rejected because client SDKs and frontend error interceptors depend on the invariant `{ error: { code, message, details, request_id } }`.
- **Enforcing body limits at Pydantic layer only:** Rejected because large payloads would consume server memory and CPU cycles before Pydantic parsing begins.
