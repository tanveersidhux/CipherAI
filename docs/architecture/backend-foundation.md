# CIPHER AI: Backend Foundation Architecture

| Metadata | Details |
| :--- | :--- |
| **Project** | CIPHER AI (Understand threats. Protect what matters.) |
| **Document** | Backend Architecture, Middleware Ordering, Error Handling, and Logging Design |
| **Phase** | PHASE_03: FastAPI Setup, Middleware, Database, and Health Endpoint |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |

---

## 1. Overview & Architectural Role

The `api/` package provides the stateless, deterministic threat intelligence API for CIPHER AI. Built on **FastAPI (Python 3.11+)**, it adheres to four bedrock security principles:

1. **Zero Secret Leakage:** Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `LLM_API_KEY`, `SUPABASE_JWT_SECRET`) are wrapped in `SecretStr`, masked in all `repr()`/`str()` calls, excluded from startup logs, omitted from health outputs, and scrubbed from JSON logs by a dedicated redaction filter.
2. **Universal Error Envelope:** Every non-2xx response without exception returns the standard envelope:
   ```json
   {
     "error": {
       "code": "SCREAMING_SNAKE_CASE",
       "message": "User-safe description",
       "details": [],
       "request_id": "uuid-or-trace-string"
     }
   }
   ```
3. **No Outbound Fetching in MVP:** The backend analyzes submitted URLs and scam messages strictly offline using lexical heuristics and indicators. It never makes outbound network calls to user-supplied targets.
4. **Resilient Non-Blocking Health:** The `/api/v1/health` endpoint reports process health as `status: "ok"` while isolating downstream dependency states (`database`, `llm`). A degraded dependency does not cause 503 process termination, and probes are cached for 10 seconds.

---

## 2. Middleware Stack & Execution Order

FastAPI executes middlewares in the order they are wrapped (the first added is innermost, the last added is outermost). The request/response cycle is structured as follows:

```
[Incoming Request]
       │
       ▼
┌──────────────────────────────────────┐
│ 1. CORSMiddleware (Outermost)         │ ── Checks Origin header against CORS_ALLOWED_ORIGINS.
└──────────────────────────────────────┘    Handles OPTIONS preflight without touching app code.
       │
       ▼
┌──────────────────────────────────────┐
│ 2. SecurityHeadersMiddleware         │ ── Sets X-Content-Type-Options: nosniff, X-Frame-Options: DENY,
└──────────────────────────────────────┘    Referrer-Policy: no-referrer, Cache-Control: no-store,
       │                                    Permissions-Policy, and HSTS (in production).
       ▼
┌──────────────────────────────────────┐
│ 3. RequestIdAndLoggingMiddleware     │ ── Validates incoming X-Request-ID (or generates UUID4).
└──────────────────────────────────────┘    Binds to request.state and contextvars. Emits structured
       │                                    access log on completion (path stripped of query strings).
       ▼
┌──────────────────────────────────────┐
│ 4. RequestBodyLimitMiddleware (ASGI) │ ── Rejects Content-Length or streamed bodies exceeding
└──────────────────────────────────────┘    MAX_REQUEST_BODY_BYTES (default 20KB) with 413 INPUT_TOO_LARGE.
       │
       ▼
[Router / Endpoint Execution]
```

### Why Each Middleware Exists:
- **CORSMiddleware:** Prevents unauthorized web clients from interacting with the API while granting access to the Vite dev server (`http://localhost:5173`) and production frontend domains.
- **SecurityHeadersMiddleware:** Defense-in-depth against MIME confusion attacks, clickjacking, referrer leakage, and unauthorized browser API access.
- **RequestIdAndLoggingMiddleware:** Guarantees end-to-end auditability. Every access log line, application log, and error envelope shares the exact same `request_id`. Query strings and user payloads are explicitly stripped from access logs to prevent credential leakage.
- **RequestBodyLimitMiddleware:** Enforces memory bounds at the ASGI socket level. Rejects oversized HTTP bodies before large payloads can consume application memory.

---

## 3. Typed Configuration (`app/core/config.py`)

Configuration is managed via `pydantic-settings` (`Settings`):
- **Sources:** Host environment variables take precedence, falling back to local `api/.env`.
- **Validation Rules:**
  - In production (`APP_ENV == "production"`), `CORS_ALLOWED_ORIGINS` must be non-empty, must not contain wildcards (`*`), and every origin must use `https://`.
  - Numeric limits (`MAX_MESSAGE_CHARS`, `MAX_URL_CHARS`, `RATE_LIMIT_SCANS_PER_MINUTE`, `MAX_REQUEST_BODY_BYTES`) have strictly enforced lower and upper bounds.
  - If `LLM_ENABLED` is true but `LLM_API_KEY` is not provided, the application logs a warning and marks `llm_status = "not_configured"` instead of failing at startup.
- **Isolation:** The `create_app()` factory overrides the `get_settings` dependency with the provided instance, ensuring full test isolation without mutating global environment state.

---

## 4. Exception Handling Strategy (`app/core/errors.py`)

Domain exceptions inherit from `AppError`:
- `ValidationError` (422)
- `InvalidUrlError` (422)
- `InputTooLargeError` (413)
- `UnauthenticatedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `MethodNotAllowedError` (405) — *Additive extension approved in ADR-0007*
- `RateLimitedError` (429)
- `DependencyUnavailableError` (503)
- `InternalError` (500)

### Universal Handlers:
- **`AppError`**: Returns domain status, message, and details list.
- **`RequestValidationError`**: Converts Pydantic v2 validation errors into field/issue pairs. **Never echoes submitted input values.**
- **`StarletteHTTPException`**: Handles 404 (Not Found) and 405 (Method Not Allowed) using the standardized envelope.
- **`Exception` (Catch-all)**: Logs full exception traceback server-side only with the `request_id`. Returns a clean generic 500 error envelope to the client.

---

## 5. Structured JSON Logging (`app/core/logging.py`)

- **Format:** Single-line JSON objects with ISO 8601 UTC timestamps:
  ```json
  {"timestamp": "2026-10-22T12:00:00Z", "level": "INFO", "logger": "cipher.access", "message": "Access log", "request_id": "...", "method": "GET", "path": "/api/v1/health", "status_code": 200, "duration_ms": 1.25}
  ```
- **Redaction Filter:** Automatically scrubs sensitive dictionary keys (`authorization`, `api_key`, `token`, `secret`, `password`, `service_role`, `cookie`) and inline Bearer tokens before writing to stdout.
- **Exclusions:** Request bodies, scanned URLs, and query strings are never logged.

---

## 6. Health Check Design (`app/api/v1/health.py`)

- **Path:** `GET /api/v1/health`
- **Response Model:** `HealthResponse`
- **Contract:**
  ```json
  {
    "status": "ok",
    "app_version": "1.0.0",
    "environment": "development",
    "timestamp": "2026-10-22T12:00:00.000000Z",
    "dependencies": {
      "database": "ok",
      "llm": "disabled"
    }
  }
  ```
- **Caching:** The Supabase REST reachability check has a 10-second in-memory TTL to prevent health probe floods from exhausting database connections.
- **Zero LLM Invocation:** The health check inspects configuration presence only and never makes outbound API calls to LLM providers.
