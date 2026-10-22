# CIPHER AI — Project Risk Register

| Metadata | Details |
| :--- | :--- |
| **Title** | Project Risk Register |
| **Phase** | PHASE_01: Requirements, Scope, Architecture, and Technical Specification |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior Software Architect & Risk Manager |

---

## 1. Overview & Risk Assessment Framework

This register identifies technical, operational, schedule, security, and AI-related risks facing the CIPHER AI project during hackathon execution and subsequent productionization. 

Risks are evaluated using standard qualitative scales:
- **Likelihood:** Low, Medium, High
- **Impact:** Low, Medium, High, Critical
- **Severity Rating:** Derived from Likelihood × Impact.

---

## 2. Risk Register Matrix (14 Project Risks)

| Risk ID | Category | Risk Description | Likelihood | Impact | Severity | Mitigation Strategy | Assigned Owner |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | Technical / Security | **Accidental SSRF Exposure via Future Outbound Fetching:** Developer adds URL resolution or page fetching without sandboxing. | Low (in MVP) / High (post-MVP) | Critical | **High** | Architectural invariant (ADR-0003): MVP strictly forbids network requests to scanned URLs. Future fetcher specification mandates strict IP allowlisting and socket pinning. | Backend Security Lead |
| **RSK-02** | AI / LLM | **Upstream LLM Outage or Rate Limit Depletion During Demo:** The external LLM API experiences downtime, high latency (>15s), or quota exhaustion. | Medium | High | **High** | Resilient fallback architecture (ADR-0002 / ADR-0005): Deterministic fallback engine generates structured explanations offline with zero 500 errors. | AI Engineer |
| **RSK-03** | AI / Security | **Prompt Injection Overriding Security Verdicts:** Malicious payload inside a scanned message tricks the LLM into claiming safety. | High | High | **High** | Separation of scoring and explanation: Rules engine deterministically assigns scores; prompt hierarchy encloses input in `<untrusted_data>`; strict output validation. | AI Engineer & Security Lead |
| **RSK-04** | Schedule | **Full-Stack Integration Bottleneck Near Demo Deadline:** Frontend and backend teams encounter data contract mismatches when connecting APIs at the last hour. | Medium | High | **High** | Machine-readable JSON Schemas and OpenAPI 3.1 contracts frozen in Phase 01; frontend mocked against schema from Hour 04. | Full-Stack Lead |
| **RSK-05** | Technical / Security | **Catastrophic Regex ReDoS Freezing Backend Process:** Complex regular expressions in URL or message analyzers experience exponential backtracking. | Medium | High | **Medium** | Ban nested open quantifiers; enforce linear regexes; benchmark with 10,000-character test fixtures in Phase 04. | Backend Security Lead |
| **RSK-06** | Privacy / Legal | **Inadvertent Exposure of User PII in Scanned Messages:** Users paste confidential messages into the public scanner; database leak exposes plaintext data. | High | High | **High** | Zero-plaintext storage policy: Raw message text is never written to DB or logs. Store only SHA-256 hash and truncated 200-char preview. | Database / DevOps Lead |
| **RSK-07** | Deployment | **CORS Configuration Errors Blocking SPA API Calls:** Cross-origin preflight requests fail in cloud hosting environments. | Medium | Medium | **Medium** | Explicit origin whitelisting in FastAPI settings via `CORS_ALLOWED_ORIGINS`; automated test in Phase 03. | DevOps Lead |
| **RSK-08** | Security | **Accidental Exposure of Backend API Keys in Git:** Secrets (`LLM_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) committed to public repository. | Medium | Critical | **High** | `.gitignore` configured in Phase 01; `gitleaks` pre-commit audit; frontend variables strictly restricted to `VITE_` prefix. | Security Lead |
| **RSK-09** | Schedule | **Scope Creep from Post-MVP Features (Auth / EML):** Team attempts to build Supabase Auth or email ingestion before MVP URL/Message flows are stable. | Medium | High | **High** | Scope Matrix cut-line rule: Strict scope freeze; optional features cannot become prerequisites of MVP delivery. | Team Lead |
| **RSK-10** | Technical / Data | **Supabase Database Connection Issues or Downtime:** Network partition or connection pool limits prevent database writes. | Low | Medium | **Medium** | Backend repository layer provides automatic graceful degradation to transient in-memory mode if Supabase fails. | DevOps Lead |
| **RSK-11** | UX / Legal | **User Sues After Engaging with Compromised Domain:** User encounters a zero-day phishing link, assumes it is clean, and loses funds. | Low | High | **Medium** | Universal ban on the word "safe"; mandatory limitation banner on every low-risk report stating analysis does not guarantee safety. | Product Lead |
| **RSK-12** | Quality / Accessibility | **Accessibility Failures on Mobile Viewports:** Touch targets too small or low contrast on mobile screens during evaluator review. | Medium | Medium | **Medium** | WCAG 2.1 AA targets defined in NFRs; automated Axe DevTools accessibility checks in Phase 02 and Phase 09. | Frontend Engineer |
| **RSK-13** | AI / Cost | **Runaway Token Costs from Unbounded LLM Calls:** High request volume causes excessive OpenAI/Anthropic billing spikes. | Medium | Low | **Low** | Strict output token ceiling (`max_tokens: 800`); single-retry limit; client rate-limiting (30 scans/min). | AI Engineer |
| **RSK-14** | Architecture | **IDOR Vulnerability Allowing History Deletion:** Malicious user enumerates UUIDs to delete scans submitted by other sessions. | Medium | High | **Medium** | Repository and RLS policy enforce `owner_id = session_id`; non-matching deletion attempts return HTTP 403/404. | Backend Security Lead |

---

## 3. Document Cross-References

- [Scope Matrix](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/requirements/scope-matrix.md)
- [Execution Plan](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/requirements/execution-plan.md)
- [Threat and Abuse Model](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/security/threat-model.md)
- [Non-Functional Requirements](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/requirements/non-functional-requirements.md)
