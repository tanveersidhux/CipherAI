# CIPHER AI — Security Findings & Remediation Register

| Metadata | Details |
| :--- | :--- |
| **Document** | Security Vulnerability Findings Register (SEC-001 through SEC-015) |
| **Phase** | PHASE_09: Hardening, Threat Model, Privacy Review, and Final Verification |
| **Status** | 100% Remediated & Verified |
| **Date** | 2026-10-23 |

---

## 1. Findings Summary

| ID | Title | Severity | Status | Remediated File(s) | Verification Test / Tool |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **SEC-001** | SSRF via Obfuscated IP Notations (Hex, Octal, Dword, Mapped IPv6) | **HIGH** | **RESOLVED** | [`url_validation.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/engine/url_validation.py), [`reputation_service.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/services/reputation_service.py) | `tests/security/test_ssrf.py` |
| **SEC-002** | Cloud Metadata & Link-Local IP Access (`169.254.169.254`) | **CRITICAL** | **RESOLVED** | [`url_validation.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/engine/url_validation.py) | `tests/security/test_ssrf.py` |
| **SEC-003** | CSV Formula Injection (CWE-1236) in JSON/CSV Export | **MEDIUM** | **RESOLVED** | [`export_service.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/services/export_service.py) | `tests/unit/test_exports.py` |
| **SEC-004** | Insecure Direct Object Reference (IDOR) on Investigation Cases | **HIGH** | **RESOLVED** | [`case_repository.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/repositories/case_repository.py), [`cases.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/api/v1/cases.py) | `tests/authz/test_idor.py` |
| **SEC-005** | IDOR on Asynchronous Batch Scanning Operations | **HIGH** | **RESOLVED** | [`batch_service.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/services/batch_service.py), [`batches.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/api/v1/batches.py) | `tests/authz/test_idor.py` |
| **SEC-006** | Incomplete Authorization Enforcement Across Endpoints | **HIGH** | **RESOLVED** | [`auth.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/core/auth.py), [`router.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/api/v1/router.py) | `tests/authz/test_endpoint_matrix.py` |
| **SEC-007** | Prompt Injection via Adversarial Email & Message Content | **HIGH** | **RESOLVED** | [`sanitizer.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/ai/sanitizer.py) | `tests/security/test_prompt_injection.py` |
| **SEC-008** | LLM Hallucinated Safety Affirmations (`"100% safe"`, HTML links) | **MEDIUM** | **RESOLVED** | [`validator.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/ai/validator.py) | `tests/security/test_prompt_injection.py` |
| **SEC-009** | Potential Plaintext Storage of Confidential Message Bodies | **HIGH** | **RESOLVED** | [`persistence_service.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/services/persistence_service.py) | `tests/unit/test_persistence.py` |
| **SEC-010** | Resource Amplification via Batch Scanning Queue | **MEDIUM** | **RESOLVED** | [`batch_service.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/services/batch_service.py) | `tests/unit/test_batches.py` |
| **SEC-011** | Unbounded MIME Traversal in Email Forensic Parser | **MEDIUM** | **RESOLVED** | [`parser.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/services/email_analysis/parser.py) | `tests/unit/test_email_analysis.py` |
| **SEC-012** | Cryptographic Bypass via JWT Algorithm `"none"` | **CRITICAL** | **RESOLVED** | [`auth.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/core/auth.py) | `tests/unit/test_auth.py` |
| **SEC-013** | Backend Secrets Exposure in Client Frontend Bundle | **CRITICAL** | **RESOLVED** | Frontend Vite configuration & environment isolation | `scripts/check-no-secrets-in-web.mjs` |
| **SEC-014** | Cross-Site Scripting (XSS) via Unsanitized Indicator Text | **HIGH** | **RESOLVED** | [`normalization.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/engine/normalization.py), React JSX escaping | Vitest DOM test suite |
| **SEC-015** | Missing Row-Level Security on Database Entities | **HIGH** | **RESOLVED** | [`20261023000004_phase07_rls_policies.sql`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/supabase/migrations/20261023000004_phase07_rls_policies.sql) | `scripts/audit_rls.py` |

---

## 2. Detailed Remediation Evidence

### SEC-001 & SEC-002: SSRF & Cloud Metadata Protection
- **Vulnerability:** Obfuscated IP addresses (e.g. `http://0x7f000001/`, `http://2130706433/`, `http://0177.0.0.1/`, `http://169.254.169.254/latest/meta-data/`) could bypass string-based hostname checks and trigger egress requests during reputation checks.
- **Remediation:** Added `_parse_ip_notation` and `is_ssrf_host` to [`app/engine/url_validation.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/engine/url_validation.py). All decimal, hex, octal, 2-to-4 part shorthand, IPv4-mapped IPv6, and link-local addresses are recognized and flagged as private. [`ReputationService.evaluate_url`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/services/reputation_service.py) intercepts these targets prior to network calls and immediately returns without querying external feeds.
- **Verification:** 44 test cases in `api/tests/security/test_ssrf.py` pass cleanly.

### SEC-003: Formula Injection (CWE-1236)
- **Vulnerability:** Malicious strings in scan targets, indicators, or case titles beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` execute arbitrary commands when opened in Microsoft Excel or Google Sheets.
- **Remediation:** Implemented `neutralize_csv_cell` in [`app/services/export_service.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/services/export_service.py) prefixing a single-quote escape to every dangerous character.
- **Verification:** 10 test cases in `api/tests/unit/test_exports.py` pass cleanly.

### SEC-004 & SEC-005: IDOR Multi-Tenant Isolation
- **Vulnerability:** Unchecked database lookups could allow User A to query or mutate User B's cases, case notes, attachments, or batch scans.
- **Remediation:** Enforced tenant subject checks (`WHERE user_id = :auth_uid`) in both application repository methods and Supabase database Row-Level Security policies.
- **Verification:** `api/tests/authz/test_idor.py` asserts that User B cannot read, edit, delete, append notes to, or export User A's dossiers.

### SEC-007 & SEC-008: AI Prompt Injection & Hallucinated Safe Assertions
- **Vulnerability:** Adversarial prompts contained inside scanned messages attempting to trick the AI into declaring malicious phishing clean or leaking the system instructions.
- **Remediation:** Implemented multi-layered defense: random delimiter boundaries, 16 regex injection signatures in [`app/ai/sanitizer.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/ai/sanitizer.py), deterministic score invariance, and five-stage output validation in [`app/ai/validator.py`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/ai/validator.py) which strictly forbids affirmative safe claims (`"completely safe"`, `"100% safe"`, `"harmless"`).
- **Verification:** `api/tests/security/test_prompt_injection.py` passes all 25 validation checks.
