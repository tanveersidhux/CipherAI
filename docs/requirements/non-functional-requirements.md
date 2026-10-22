# CIPHER AI — Non-Functional Requirements (NFR)

| Metadata | Details |
| :--- | :--- |
| **Title** | Non-Functional Requirements |
| **Phase** | PHASE_01: Requirements, Scope, Architecture, and Technical Specification |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior Software Architect & Security Engineer |

---

## 1. Overview

This document specifies the non-functional requirements (quality attributes, system constraints, performance bounds, security controls, and operational limits) governing the CIPHER AI platform. Every requirement is measurable and carries a stable identifier (`NFR-XXX`).

---

## 2. Measurable Requirements Catalog

### 2.1 Performance & Latency

| ID | Requirement | Target Metric | Measurement Method | Verification Phase |
| :--- | :--- | :--- | :--- | :--- |
| **NFR-001** | **Deterministic Scan Response Latency** | P95 < 1,000 ms; P99 < 1,500 ms | Server-side execution duration of `/api/v1/scans/*` with `options.use_ai: false` under 5 concurrent users. | Phase 04 / Phase 09 |
| **NFR-002** | **Full Scan Response Latency (with AI)** | P95 < 15,000 ms; Hard Ceiling < 20,000 ms | End-to-end response duration of `/api/v1/scans/*` with AI enabled. | Phase 05 / Phase 09 |
| **NFR-003** | **LLM Invocation Timeout** | Exactly 15 seconds | Upstream HTTP client timeout configured on the LLM client; triggers deterministic fallback upon expiration. | Phase 05 |
| **NFR-004** | **Initial Page Load Time (Web App)** | Largest Contentful Paint (LCP) < 2.0 s | Chrome Lighthouse test on 3G network simulation. | Phase 02 / Phase 09 |
| **NFR-005** | **Dashboard Aggregation Query Latency** | P95 < 500 ms | Response duration of `/api/v1/dashboard/summary` against a database populated with 10,000 scan records. | Phase 07 |

---

### 2.2 Availability & Resilience

| ID | Requirement | Target Metric | Measurement Method | Verification Phase |
| :--- | :--- | :--- | :--- | :--- |
| **NFR-006** | **Hackathon Demo Availability** | 99.9% uptime during active demo window | Health-check endpoint `/api/v1/health` polled every 30 seconds via synthetic ping. | Phase 03 / Phase 10 |
| **NFR-007** | **Zero-Downtime AI Outage Fallback** | 100% graceful fallback | When upstream LLM endpoint is unreachable, backend completes scan report via deterministic fallback with zero 500 errors. | Phase 05 |
| **NFR-008** | **Database Failure Resilience** | Graceful degradation | If Supabase is unreachable, scan operations continue in transient in-memory mode, returning reports with persistence marked unavailable. | Phase 07 |

---

### 2.3 Accessibility & Responsive Design

| ID | Requirement | Target Metric | Measurement Method | Verification Phase |
| :--- | :--- | :--- | :--- | :--- |
| **NFR-009** | **Accessibility Standard Compliance** | WCAG 2.1 AA | Axe DevTools automated accessibility audit: 0 critical or serious violations. | Phase 02 / Phase 09 |
| **NFR-010** | **Multi-Signal Risk Presentation** | 100% multi-signal compliance | Every risk level display pairs color with an explicit textual label and a distinct SVG icon; never color alone. | Phase 02 |
| **NFR-011** | **Keyboard Navigation & Focus Management** | 100% navigable without mouse | All interactive elements (inputs, buttons, modal dismissals, history rows) support Tab navigation with visible focus rings. | Phase 02 |
| **NFR-012** | **Responsive Viewport Breakpoints** | Seamless rendering across 360px, 768px, 1280px | Visual verification at 360px (mobile), 768px (tablet), and 1280px+ (desktop) with zero horizontal overflow. | Phase 02 |
| **NFR-013** | **Touch Target Dimensions** | Minimum 44 × 44 CSS pixels | Touch target bounding box audit on all interactive buttons and inputs for viewports < 768px. | Phase 02 |

---

### 2.4 Privacy & Data Protection

| ID | Requirement | Target Metric | Measurement Method | Verification Phase |
| :--- | :--- | :--- | :--- | :--- |
| **NFR-014** | **Ephemeral Message Privacy** | 0 full raw messages in DB | Audit database schema and insert routines: `scans` table stores only `input_hash` (SHA-256) and truncated preview (max 200 chars). | Phase 07 |
| **NFR-015** | **Defanged Malicious URL Rendering** | 0 active clickable links | UI component tests verify that submitted URLs are rendered defanged (`hxxps://`, `[.]`) as plain text without active `href`. | Phase 02 / Phase 06 |
| **NFR-016** | **Anonymous Session Isolation** | 100% session segregation | Cryptographic session tokens isolate anonymous scan history; client A cannot view client B's scans. | Phase 07 |
| **NFR-017** | **Data Retention & Expiry** | 30-day automated TTL policy | Scheduled cron / TTL trigger in database deletes anonymous session records older than 30 days. | Phase 07 |

---

### 2.5 Security & Robustness

| ID | Requirement | Target Metric | Measurement Method | Verification Phase |
| :--- | :--- | :--- | :--- | :--- |
| **NFR-018** | **Zero Outbound URL Fetching (SSRF Guard)** | 0 outbound HTTP/TCP requests to scanned domains | Network egress packet inspection during scanning of internal (`127.0.0.1`, `169.254.169.254`) and external targets. | Phase 04 / Phase 09 |
| **NFR-019** | **Regex ReDoS Immunity** | All regex evaluations < 50 ms | Static linting with `flake8-regex` or `rstr` fuzzing against pathological inputs (e.g., `a` repeated 10,000 times). | Phase 04 / Phase 09 |
| **NFR-020** | **Rate Limiting Enforcement** | HTTP 429 upon > 30 requests/min | Integration tests using Locust or rapid curl loop trigger HTTP 429 with `RATE_LIMITED` error envelope. | Phase 03 / Phase 09 |
| **NFR-021** | **Strict Secret Isolation** | 0 secrets in client bundles or logs | Automated repo scan with `gitleaks` and frontend bundle inspection ensuring no `LLM_API_KEY` or `SERVICE_ROLE_KEY` leakage. | Phase 03 / Phase 09 |
| **NFR-022** | **CORS Origin Whitelisting** | No `Access-Control-Allow-Origin: *` in production | API options pre-flight check confirms explicit origin matching against `CORS_ALLOWED_ORIGINS`. | Phase 03 / Phase 10 |

---

### 2.6 Observability, Logging & Error Handling

| ID | Requirement | Target Metric | Measurement Method | Verification Phase |
| :--- | :--- | :--- | :--- | :--- |
| **NFR-023** | **Standard Error Enveloping** | 100% structured error adherence | All non-2xx responses conform to the standard error envelope `{ error: { code, message, details, request_id } }`. | Phase 03 |
| **NFR-024** | **Distributed Request Tracing** | 100% response header propagation | Every incoming HTTP request is assigned a UUID v4 `X-Request-ID` returned in response headers and logged in context. | Phase 03 |
| **NFR-025** | **Zero Sensitive Data in Logs** | 0 secrets or full payloads logged | Log formatters redact authentication tokens, full message payloads, and basic auth credentials from URLs. | Phase 03 / Phase 09 |

---

### 2.7 AI Cost & Resource Control

| ID | Requirement | Target Metric | Measurement Method | Verification Phase |
| :--- | :--- | :--- | :--- | :--- |
| **NFR-026** | **LLM Token Output Ceiling** | Maximum 800 output tokens | LLM API client configuration sets `max_tokens: 800` to prevent runaway generation costs. | Phase 05 |
| **NFR-027** | **LLM Retry Budget** | Maximum 1 retry per scan | Retry decorator allows exactly 1 retry upon transient network or schema error before defaulting to fallback. | Phase 05 |

---

## 3. Document Cross-References

- [Product Requirements Document](file:///docs/requirements/PRD.md)
- [System Architecture](file:///docs/architecture/architecture.md)
- [Threat and Abuse Model](file:///docs/security/threat-model.md)
- [Testing & QA Strategy](file:///docs/testing/test-strategy.md)
