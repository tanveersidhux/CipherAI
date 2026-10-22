# ADR-0003: No Backend Fetching of Submitted URLs in MVP

| Metadata | Details |
| :--- | :--- |
| **Title** | ADR-0003: No Backend Fetching of Submitted URLs in MVP |
| **Phase** | PHASE_01: Requirements, Scope, Architecture, and Technical Specification |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior Security Engineer |

---

## 1. Context

URL scanners often attempt to crawl or fetch submitted websites to inspect HTML tags, capture screenshots, or follow redirect chains. However, fetching untrusted user-supplied URLs introduces severe security risks:
- Server-Side Request Forgery (SSRF) targeting internal services, local loopback interfaces, and cloud metadata endpoints (`169.254.169.254`).
- DNS rebinding attacks.
- Denial of Service (DoS) from slowloris targets or decompression bombs.
- Legal/IP liability from accessing illicit or malicious host infrastructure.

Building a production-grade, hardened SSRF sandbox requires extensive isolation infrastructure that would consume a disproportionate amount of a 12–24 hour hackathon budget.

## 2. Decision

The MVP backend **will not perform any outbound HTTP or network requests to user-supplied URLs**. 

- URL analysis in the MVP is strictly lexical, syntactic, and structural (evaluating schemes, IP hosts, punycode/homoglyphs, subdomains, path keywords, query strings, and TLDs).
- Any future capability that requires fetching (Phase 08+) must implement the full SSRF-safe fetcher specification documented in the System Architecture before being enabled.

## 3. Consequences

### Positive
- Completely eliminates SSRF vulnerabilities in the MVP.
- Zero network latency or external timeout dependencies for URL analysis (< 10 ms execution).
- Zero risk of cloud metadata credential theft via the scanner.

### Negative / Tradeoffs
- Cannot inspect final landing page HTML or DOM redirects for shortened URLs offline (though URL shortener presence is detected and flagged as an indicator).

## 4. Alternatives Considered

- **Naive HTTP Fetch using `httpx.get()`:** Rejected immediately due to critical SSRF exposure.
- **Headless Browser in Docker Sandbox:** Rejected due to operational complexity, container resource consumption, and cold-start latency unsuitable for rapid hackathon delivery.
