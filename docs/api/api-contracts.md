# CIPHER AI — API Contracts and Endpoint Specification

| Metadata | Details |
| :--- | :--- |
| **Title** | API Contracts and Endpoint Specification |
| **Phase** | PHASE_01: Requirements, Scope, Architecture, and Technical Specification |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior Backend Architect & Security Engineer |

---

## 1. Global Conventions

- **Base Path:** `/api/v1`
- **Protocol:** HTTPS REST, JSON request and response bodies.
- **Naming Style:** Lowercase, plural nouns, hyphenated multi-word path parameters, `snake_case` field names.
- **Request Tracing:** Every HTTP response returns the header `X-Request-ID: <uuid>`. All error response bodies repeat this ID.
- **Session Isolation:** All scanning and history requests pass an `X-Session-ID: <uuid>` header generated client-side and preserved in browser `localStorage`.
- **Rate Limiting:** Enforced at 30 requests per minute per IP / Session ID on scanning endpoints. Standard headers:
  - `X-RateLimit-Limit: 30`
  - `X-RateLimit-Remaining: <integer>`
  - `X-RateLimit-Reset: <epoch_seconds>`

---

## 2. Standard Error Response Envelope

All non-2xx responses conform strictly to the following schema:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The provided URL exceeds the maximum allowed length of 2048 characters.",
    "details": [
      {
        "field": "url",
        "issue": "String should have at most 2048 characters"
      }
    ],
    "request_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  }
}
```

### Documented Error Codes

| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| **422** | `VALIDATION_ERROR` | Schema validation error or malformed input payload. |
| **422** | `INVALID_URL` | Submitted string does not conform to RFC 3986 URL syntax. |
| **413** | `INPUT_TOO_LARGE` | Input payload exceeds size limits (2,048 chars for URL; 5,000 chars for message). |
| **401** | `UNAUTHENTICATED` | Missing or invalid session identifier or JWT token. |
| **403** | `FORBIDDEN` | Caller does not own the requested scan or case resource. |
| **404** | `NOT_FOUND` | Specified scan ID or case ID not found or already deleted. |
| **405** | `METHOD_NOT_ALLOWED` | HTTP method not supported for the requested route. |
| **429** | `RATE_LIMITED` | Scan request frequency limit exceeded. |
| **503** | `DEPENDENCY_UNAVAILABLE` | Database connection failure or required backend subsystem down. |
| **500** | `INTERNAL_ERROR` | Unhandled server exception. Sanitized safe message displayed to user. |

---

## 3. Core Endpoints Specification (MVP)

### 3.1 `GET /api/v1/health`

Returns service health, version, environment, and dependency statuses without revealing infrastructure secrets.

- **Request:** None
- **Response (200 OK):**
```json
{
  "status": "ok",
  "app_version": "1.0.0",
  "environment": "development",
  "timestamp": "2026-10-22T15:30:00Z",
  "dependencies": {
    "database": "ok",
    "llm": "enabled"
  }
}
```

---

### 3.2 `POST /api/v1/scans/url`

Analyzes a suspicious URL using lexical, syntactic, and structural rules. Performs no outbound network requests.

- **Headers:** `X-Session-ID: <uuid>` (optional in request; generated if omitted)
- **Request Body:**
```json
{
  "url": "http://192.0.2.14:8080/secure/login/verify.php",
  "options": {
    "use_ai": true,
    "persist": true
  }
}
```
- **Response (200 OK):** `ThreatReport` JSON
```json
{
  "report_id": "7f8b9c24-5d12-4c8e-a9b1-3e4f6a7b8c9d",
  "schema_version": "1.0",
  "scan_type": "url",
  "created_at": "2026-10-22T15:30:00Z",
  "input": {
    "display_value": "hxxp://192.0.2.14:8080/secure/login/verify.php",
    "normalized_value": "http://192.0.2.14:8080/secure/login/verify.php",
    "input_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "input_length": 46
  },
  "assessment": {
    "risk_score": 85,
    "risk_level": "critical",
    "confidence": "high",
    "verdict_label": "Critical threat indicators identified",
    "limitations": [
      "Offline lexical analysis only; page content was not fetched or executed."
    ]
  },
  "indicators": [
    {
      "indicator_id": "URL_IP_HOST",
      "category": "domain",
      "evidence_kind": "observed",
      "title": "IP Address Used as Hostname",
      "description": "Destination specifies a raw IP address rather than a domain name.",
      "observed_value": "192.0.2.14",
      "severity": "high",
      "triggered": true
    }
  ],
  "score_breakdown": [
    {
      "indicator_id": "URL_IP_HOST",
      "points": 35,
      "reason": "Direct IP address host used to bypass domain reputation",
      "evidence_kind": "observed",
      "capped": false
    }
  ],
  "external_evidence": [],
  "ai_explanation": {
    "summary": "This link directs to an unencrypted raw numerical IP address on port 8080 with a login verification path.",
    "key_findings": [
      {
        "text": "The link connects directly to an IP address (192.0.2.14) rather than a recognized domain.",
        "indicator_ids": ["URL_IP_HOST"]
      }
    ],
    "user_guidance": "Do not enter passwords or personal data on this link.",
    "uncertainty_notes": "Lexical analysis was performed without outbound network requests.",
    "generated_by": "llm",
    "model": "claude-3-5-sonnet-20241022",
    "validated": true
  },
  "recommended_actions": [
    {
      "action_id": "ACT_DO_NOT_CLICK",
      "priority": 1,
      "text": "Do not click or submit information to this address.",
      "applies_to_levels": ["high", "critical"]
    }
  ],
  "engine_version": "1.0.0",
  "processing": {
    "duration_ms": 1420,
    "ai_status": "used",
    "external_lookup_status": "not_attempted"
  }
}
```

---

### 3.3 `POST /api/v1/scans/message`

Analyzes message text for social engineering, urgency tactics, authority impersonation, and payment lures.

- **Headers:** `X-Session-ID: <uuid>`
- **Request Body:**
```json
{
  "message": "URGENT: Your Wells Fargo account has been suspended due to unauthorized activity. You must verify within 24 hours at http://bit.ly/3abc to prevent permanent closure.",
  "channel": "sms",
  "options": {
    "use_ai": true,
    "persist": true
  }
}
```
- **Response (200 OK):** `ThreatReport` (risk score 80, level critical, capped urgency, indicators `MSG_URGENCY_DEADLINE`, `MSG_ACCOUNT_CLOSURE_THREAT`, `MSG_BANK_IMPERSONATION`, `MSG_EMBEDDED_SHORT_LINK`).

---

### 3.4 `GET /api/v1/scans`

Retrieves a paginated list of scans belonging to the caller's anonymous session or user account.

- **Query Parameters:**
  - `limit`: Integer (1–100, default 20)
  - `cursor`: String (base64 pagination token)
  - `risk_level`: Filter enum (`low`, `medium`, `high`, `critical`, `inconclusive`)
  - `scan_type`: Filter enum (`url`, `message`, `email`, `batch_item`)
- **Headers:** `X-Session-ID: <uuid>`
- **Response (200 OK):**
```json
{
  "items": [
    {
      "id": "7f8b9c24-5d12-4c8e-a9b1-3e4f6a7b8c9d",
      "scan_type": "url",
      "display_value": "hxxp://192.0.2.14:8080/secure/login/verify.php",
      "risk_score": 85,
      "risk_level": "critical",
      "created_at": "2026-10-22T15:30:00Z"
    }
  ],
  "next_cursor": null
}
```

---

### 3.5 `GET /api/v1/scans/{scan_id}`

Retrieves the complete `ThreatReport` for a past scan.

- **Path Parameter:** `scan_id` (UUID v4)
- **Headers:** `X-Session-ID: <uuid>`
- **Response (200 OK):** `ThreatReport`
- **Errors:** `404 NOT_FOUND` (if scan does not exist or was deleted), `403 FORBIDDEN` (if owned by a different session).

---

### 3.6 `DELETE /api/v1/scans/{scan_id}`

Soft-deletes a scan from the caller's session history.

- **Path Parameter:** `scan_id` (UUID v4)
- **Headers:** `X-Session-ID: <uuid>`
- **Response (204 No Content):** Empty body.
- **Errors:** `404 NOT_FOUND`, `403 FORBIDDEN`.

---

### 3.7 `GET /api/v1/dashboard/summary`

Aggregates statistics for the user's active session or team workspace.

- **Headers:** `X-Session-ID: <uuid>`
- **Response (200 OK):**
```json
{
  "total_scans": 24,
  "by_risk_level": {
    "low": 8,
    "medium": 6,
    "high": 7,
    "critical": 3,
    "inconclusive": 0
  },
  "by_scan_type": {
    "url": 18,
    "message": 6
  },
  "recent_scans": [
    {
      "id": "7f8b9c24-5d12-4c8e-a9b1-3e4f6a7b8c9d",
      "scan_type": "url",
      "display_value": "hxxp://192.0.2.14:8080/secure/login/verify.php",
      "risk_score": 85,
      "risk_level": "critical",
      "created_at": "2026-10-22T15:30:00Z"
    }
  ],
  "top_indicators": [
    {
      "indicator_id": "URL_IP_HOST",
      "title": "IP Address Used as Hostname",
      "count": 12
    },
    {
      "indicator_id": "URL_CREDENTIAL_PATH_KEYWORD",
      "title": "Credential Keywords in Path",
      "count": 9
    },
    {
      "indicator_id": "MSG_URGENCY_DEADLINE",
      "title": "Artificial Urgency or Strict Deadline",
      "count": 5
    }
  ],
  "time_series": [
    { "date": "2026-10-09", "count": 1 },
    { "date": "2026-10-10", "count": 3 },
    { "date": "2026-10-11", "count": 2 },
    { "date": "2026-10-22", "count": 6 }
  ]
}
```

---

## 4. Post-MVP Draft Endpoints

- **`POST /api/v1/cases`:** Creates a new investigative case dossier linking scan IDs. Returns `201 Created`.
- **`POST /api/v1/cases/{case_id}/notes`:** Appends an investigator note to a case. Returns `201 Created`.
- **`POST /api/v1/scans/email`:** Accepts multipart `.eml` or pasted headers for RFC 822 email analysis. Returns `501 Not Implemented` in MVP.
- **`POST /api/v1/scans/batch`:** Submits an array of URLs or messages for asynchronous batch processing. Returns `501 Not Implemented` in MVP.
- **`POST /api/v1/feedback`:** Submits end-user false positive/negative reports for model evaluation. Returns `200 OK`.

---

## 5. Document Cross-References

- [OpenAPI 3.1 Draft Contract](file:///docs/api/openapi-draft.yaml)
- [ThreatReport JSON Schema](file:///docs/api/schemas/threat-report.schema.json)
- [ErrorEnvelope JSON Schema](file:///docs/api/schemas/error-envelope.schema.json)
- [Threat and Abuse Model](file:///docs/security/threat-model.md)
