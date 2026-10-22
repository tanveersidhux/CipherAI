# CIPHER AI — Threat and Abuse Model

> [!NOTE]
> The primary comprehensive threat model document is located at [`docs/security/threat-model.md`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/docs/security/threat-model.md).
> This document summarizes the STRIDE matrix, security controls, and verification findings.

## 1. Threat Methodology: STRIDE Across System Boundaries

CIPHER AI adopts an untrusted-input-by-default stance. Every scanned URL, message, email header, MIME payload, and user note is considered potentially malicious.

| Threat ID | Category | Description | Mitigating Control | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TM-01** | Info Disclosure / EoP | **SSRF via Scanned URLs:** Attacker targets `127.0.0.1`, `169.254.169.254`, IPv6 loopback, or decimal/hex notations. | Zero outbound network calls from core engine; reputation feeds explicitly bypass private/loopback/cloud metadata IPs. | **VERIFIED** |
| **TM-02** | Tampering | **Prompt Injection via Content:** Embedded instructions to override AI threat score or leak prompts. | Instruction hierarchy; random delimiter enclosure; deterministic score invariance; output schema validation. | **VERIFIED** |
| **TM-03** | Tampering | **LLM Output Manipulation:** Hallucinated indicators, arbitrary JSON, or false safety claims. | Five-stage output validation; Pydantic schema enforcement; affirmative safety claims strictly rejected. | **VERIFIED** |
| **TM-04** | Tampering / XSS | **Stored/Reflected XSS:** Active `<script>` or `javascript:` links in scanned targets. | Defanging of all URLs (`hxxps://`, `[.]`); zero `dangerouslySetInnerHTML`; React automatic JSX escaping. | **VERIFIED** |
| **TM-05** | Info Disclosure | **Secret Key Leakage:** `SUPABASE_SERVICE_ROLE_KEY` or `LLM_API_KEY` bundled in client or logged. | Strict `VITE_` frontend prefixing; secrets check script (`scripts/check-no-secrets-in-web.mjs`); log redaction filters. | **VERIFIED** |
| **TM-06** | Denial of Service | **Resource Amplification & Scanner Abuse:** Flooding scanner to exhaust quota or compute. | SlowAPI rate limiting (30 req/min per IP); bounded MIME parsing (depth 5, max 50 parts); input size ceilings. | **VERIFIED** |
| **TM-07** | Denial of Service | **Regex Denial of Service (ReDoS):** Exponential backtracking in heuristic patterns. | Linear-time heuristics; standard library string methods; bounded regex lengths without catastrophic backtracking. | **VERIFIED** |
| **TM-08** | Info Disclosure | **Multi-Tenant History Leakage:** Unauthorized enumeration of scan reports across users. | UUID v4 identifiers; Supabase Row-Level Security (`user_id = auth.uid()`); zero public table read access. | **VERIFIED** |
| **TM-09** | Broken Authorization | **IDOR on Cases, Batches, & Notes:** Tampering with another user's cases or batch jobs. | Explicit repository-level tenant checking; returns HTTP 404/403 for cross-tenant access. | **VERIFIED** |
| **TM-10** | Security Misconfig | **CORS Permissiveness:** Wildcard CORS allowing unauthorized origin access. | Strict `CORS_ALLOWED_ORIGINS` whitelist; wildcard prohibited in production environments. | **VERIFIED** |
| **TM-11** | Supply-Chain Risk | **Vulnerable Third-Party Packages:** Supply-chain compromise of npm/pip dependencies. | Strict version pinning; automated `npm audit` and vulnerability scanning in CI workflow. | **VERIFIED** |
| **TM-12** | Privacy Breach | **PII Storage in Message Scans:** Retention of confidential message bodies or credentials. | Zero-plaintext storage policy: database stores SHA-256 hash and truncated preview (max 200 chars) only. | **VERIFIED** |

---

## 2. Security Test Evidence

- **SSRF Defense:** [`api/tests/security/test_ssrf.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/tests/security/test_ssrf.py) — 44 tests passed.
- **Authorization & IDOR Matrix:** [`api/tests/authz/test_endpoint_matrix.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/tests/authz/test_endpoint_matrix.py) & [`test_idor.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/tests/authz/test_idor.py) — 28 tests passed.
- **Prompt Injection & Adversarial Safety:** [`api/tests/security/test_prompt_injection.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/tests/security/test_prompt_injection.py) — 25 tests passed.
- **Database Row-Level Security:** [`scripts/audit_rls.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/scripts/audit_rls.py) — 100% compliant across all 11 tables.
