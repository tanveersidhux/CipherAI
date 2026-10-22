# CIPHER AI — Attack Surface Analysis

| Metadata | Details |
| :--- | :--- |
| **Document** | Attack Surface Analysis & Perimeter Boundary Specification |
| **Phase** | PHASE_09: Hardening, Threat Model, Privacy Review, and Final Verification |
| **Version** | 1.0.0 |
| **Date** | 2026-10-23 |
| **Classification** | Public / Engineering Review |

---

## 1. Perimeter Architecture & Trust Boundaries

```mermaid
flowchart TD
    Client["Client Browser (React 19 SPA)"]
    API["FastAPI Backend (Port 8000)"]
    DB[("Supabase PostgreSQL (RLS Enforced)")]
    LLM["External LLM Provider (Optional)"]
    Reputation["Threat Feeds (SafeBrowsing, VT, URLhaus)"]

    Client -->|HTTPS / JSON + JWT| API
    API -->|Service Role / Direct SQL| DB
    API -.->|Defanged Hash Query (Never Raw Target)| Reputation
    API -.->|Sanitized Payload (Enclosed in Delimiters)| LLM
```

CIPHER AI enforces strict isolation between untrusted public input, backend analytical engines, and downstream threat reputation or AI providers.

---

## 2. Ingress Entry Points & Validation Matrix

| Endpoint | Ingress Data | Size / Rate Caps | Strict Validation & Sanitization | Trust Tier |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/v1/scans/url` | Target URL string | 2,048 chars max; 30 req/min | Strict RFC 3986 lexical parser; scheme whitelist (`http`, `https`); forbidden schemes rejected (`javascript:`, `data:`, `file:`, `blob:`); zero-width characters stripped. | Untrusted Public |
| `POST /api/v1/scans/message` | Suspicious message body | 5,000 chars max; 30 req/min | Unicode NFKC normalization; C0/C1 control character elimination; zero-width formatting stripped. | Untrusted Public |
| `POST /api/v1/scans/email` | RFC 822 / MIME raw email | 1 MB max; 30 req/min | Bounded MIME traversal (max recursion depth 5; max 50 MIME parts); attachment payloads discarded immediately in memory (only metadata and SHA-256 computed). | Untrusted Public |
| `POST /api/v1/batches` | Array of target URLs | Max 25 URLs per batch; 10 req/min | Per-item URL validation; deduplication; concurrency-bounded async workers (max 4 concurrent). | Authenticated User |
| `GET /api/v1/scans/{id}/export` | Export format query (`json`, `csv`) | 120 req/min | CSV cell neutralization: prefixing quotes to `=`, `+`, `-`, `@`, `\t`, `\r` to block spreadsheet formula injection (CWE-1236). | Authenticated User |
| `POST /api/v1/cases` | Case title, description, scan IDs | Title 120 chars; desc 2,000 chars | Pydantic strict schema validation (`extra="forbid"`); bounded array length (50 scans max). | Authenticated User |
| `POST /api/v1/cases/{id}/notes` | Case note body | 5,000 chars max | Plain-text storage; XSS tags defanged upon rendering; strictly scoped to `auth.uid()`. | Authenticated User |

---

## 3. Egress Communication & Threat Leakage Controls

### 3.1 External Threat Intelligence Feeds
- **Target Minimization:** When querying VirusTotal, URLhaus, or Google Safe Browsing, the engine exclusively queries canonical SHA-256 hashes or normalized URLs.
- **SSRF Defense:** Targets resolving to loopback (`127.0.0.0/8`, `::1`), RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local / cloud metadata (`169.254.169.254`, `169.254.170.2`), or obfuscated IP formats (hex, octal, decimal dword, IPv4-mapped IPv6) are intercepted before egress and **never queried externally**.
- **Bounded Timeouts:** Hard timeout of 3.0 seconds enforced per provider using `asyncio.wait_for`.

### 3.2 External AI / LLM Providers
- **Air-Gapped Prompts:** All untrusted user content is enclosed in random alphanumeric delimiters (e.g. `<untrusted_content_abc123>`).
- **Prompt Injection Interception:** 16+ adversarial signatures (instruction override, jailbreaks, system exfiltration) trigger safety flags.
- **Output Validation:** The LLM is strictly prohibited from asserting definitive safety claims (`"100% safe"`, `"completely safe"`, `"harmless"`) or returning active markdown/HTML links.

---

## 4. Authentication & Authorization Perimeter

1. **Bearer JWT Verification:**
   - Supabase Auth tokens are cryptographically verified using `HS256` / `RS256`.
   - Algorithm `"none"` is strictly rejected at the header parsing stage.
   - Expiration (`exp`) and Audience (`aud: "authenticated"`) claims are mandatory.
2. **Multi-Tenant Scoping (IDOR Prevention):**
   - All object-level queries enforce tenant ownership (`WHERE user_id = :authenticated_user_id`).
   - Cross-tenant lookups return HTTP 404 (or 403) to prevent information enumeration.
