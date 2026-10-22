# CIPHER AI — Product Requirements Document (PRD)

| Metadata | Details |
| :--- | :--- |
| **Title** | Product Requirements Document |
| **Phase** | PHASE_01: Requirements, Scope, Architecture, and Technical Specification |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior Software Architect & Technical Product Analyst |

---

## 1. Executive Summary

**CIPHER AI** is an AI-assisted digital security and threat intelligence web application designed with the tagline: *"Understand threats. Protect what matters."* 

Modern users and small organizations face an overwhelming volume of deceptive cyber threats, including malicious phishing links, brand impersonation portals, credential-harvesting pages, and high-pressure scam messages delivered via SMS, messaging apps, and email. Existing threat scanners either produce cryptic technical outputs that ordinary users cannot interpret or act as opaque black boxes that cannot be audited. 

CIPHER AI bridges this divide by delivering a dual-engine architecture:
1. A **deterministic security engine** that performs lexical, structural, and indicator-based threat analysis with transparent score attribution.
2. A **bounded AI threat intelligence analyst** that consumes structured evidence (never executing raw untrusted input) to produce plain-language explanations, contextual risk breakdowns, and prioritized defensive actions.

---

## 2. Problem Statement

1. **Information Asymmetry in Cyber Deception:** Cyber attackers exploit technical nuances (IDN homoglyphs, brand spoofing in subdomains, zero-width spaces, urgency pressure) that average consumers and frontline employees cannot detect with the naked eye.
2. **Opaque or Over-Promising Scanners:** Traditional anti-virus and URL checkers frequently output binary "safe" vs "malicious" results. Promising that an unflagged link is "safe" creates a perilous false sense of security, particularly for zero-day spear phishing.
3. **Unchecked LLM Vulnerabilities:** Naive AI-powered scanners pass raw phishing text or URLs directly into LLM prompts, leaving the scanner vulnerable to prompt injection, instruction override, hallucinated threat scores, and catastrophic data leakage.

---

## 3. Product Principles

- **Deterministic Primary Truth:** The mathematical risk score is strictly computed by deterministic rules. The LLM explains and summarizes findings but cannot arbitrarily assign or inflate scores without an underlying recorded indicator.
- **Never Claim Safety:** No URL or message is ever certified as "safe." The most favorable verdict is *"Low risk indicators found,"* accompanied by mandatory limitations explaining the boundaries of lexical analysis.
- **Fail-Safe & Resilient:** AI outages, rate limits, or schema validation failures immediately trigger a deterministic fallback summary, guaranteeing 100% service uptime for risk reports.
- **Zero-Trust Input Handling:** All submitted content is untrusted data. The backend does not execute, click, or fetch submitted links in the MVP, eliminating SSRF vulnerabilities entirely.
- **Transparent & Explainable:** Every risk point is tied to an observable or inferred indicator with an explicit plain-language rationale.

---

## 4. Target Personas

1. **Non-Technical Consumer (Alex):** Needs fast, actionable clarity when receiving suspicious SMS delivery alerts or unexpected payment confirmation links.
2. **Small Business Owner (Marcus):** Receives fake supplier invoices and vendor wire-transfer update messages; requires clear explanations to avoid catastrophic wire fraud.
3. **IT Helpdesk Analyst (Elena):** Triage tier-1 phishing inquiries from staff; needs an explainable breakdown of indicators to justify containment actions.
4. **Security Student / Researcher (Jordan):** Investigates homoglyphs, URL structural tricks, and social engineering patterns; requires granular indicator breakdowns and defanged displays.

---

## 5. Product Scope

### 5.1 MVP Scope (Mandatory)

The MVP scope is strictly bounded to the following seven capabilities:

1. **URL Scanner:** Lexical, syntactic, and structural analysis of submitted URLs (up to 2,048 characters) with strict input validation, homoglyph detection, IP host detection, and brand impersonation heuristic checks without outbound fetching.
2. **Scam-Message Analyzer:** Deterministic pattern analysis of messages (up to 5,000 characters) across SMS, chat, social, and email snippets, identifying urgency, authority impersonation, financial lure, credential requests, and embedded links.
3. **Evidence-Based Threat Report:** A unified `ThreatReport` contract displaying clamped risk scores (0–100), risk levels (`low`, `medium`, `high`, `critical`, `inconclusive`), confidence metrics, observable indicators, and an auditable score contribution table.
4. **AI Explanation with Deterministic Fallback:** Structured LLM summary generated exclusively from the structured evidence packet, strictly validated against Pydantic/JSON schemas, with automatic fallback to deterministic templated summaries upon timeout, refusal, or schema mismatch.
5. **Responsive Dashboard & Result Pages:** Clean, accessible (WCAG 2.1 AA) web interface featuring input forms, risk gauges, indicators breakdown, and defanged URL displays across desktop (1280px), tablet (768px), and mobile (360px).
6. **Basic Scan History:** Anonymous session-scoped persistent history allowing users to review and delete past scans during their session without requiring account creation.
7. **Deployable Application:** Fully containerized or hosted monorepo deployment with client-side React SPA, stateless FastAPI backend, and Supabase PostgreSQL persistence with Row-Level Security intent.

### 5.2 Post-MVP Scope (Strictly Optional)

The following features are designated as Post-MVP and are **explicitly not prerequisites** for MVP delivery:

- **Supabase Authentication:** User accounts, multi-factor authentication, and persistent cross-device private history via `auth.uid()`.
- **Investigation Cases & Case Notes:** Grouping related scans into collaborative investigative dossiers with timestamped investigator notes.
- **Third-Party Reputation Integrations:** Live API lookups against external threat feeds (e.g., Google Safe Browsing, VirusTotal).
- **Email File (.eml / Header) Ingestion:** RFC 822 email parsing, SPF/DKIM/DMARC authentication analysis, and attachment inspection.
- **Batch Scanning:** Submitting multiple URLs or bulk text files via CSV or multipart endpoints.
- **Report Exporting:** Exporting threat intelligence dossiers to signed PDF or machine-readable STIX/JSON formats.
- **Watchlists & Proactive Notifications:** Domain change monitoring and automated email/webhook alerts.
- **Browser Extension:** On-the-fly URL checking directly inside Chromium/Firefox browsers.
- **Collaboration Features:** Multi-user team workspaces, shared threat tagging, and case reassignment.
- **Continuous Monitoring & Feedback Loops:** End-user false positive/negative reporting with automated active-learning pipeline retraining.

> **MVP Scope Rule:** No optional feature listed above may be designated as a blocker or prerequisite for any MVP feature. The MVP scan history operates entirely via anonymous session tokens.

---

## 6. Assumptions and Technical Constraints

### 6.1 Assumptions
- End users have internet access and standard modern browsers (Chrome, Edge, Firefox, Safari).
- Backend deployment environments provide Python 3.11+ and outbound HTTPS connectivity to the designated LLM API provider.
- Supabase PostgreSQL is available for database persistence; if unavailable during testing, an in-memory/fallback mode is provided.
- Hackathon time budget is fixed between 12 and 24 hours with a team of 3 to 4 developers.

### 6.2 Constraints
- **Zero Outbound URL Fetching in MVP:** The backend must not make outbound HTTP/TCP requests to user-supplied URLs under any circumstance.
- **No Client-Side Secrets:** Secret keys (`LLM_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) must never be exposed to the browser.
- **Defanged Visuals:** Suspicious or malicious URLs must always be displayed defanged (e.g., `hxxp[s]://`) and cannot be rendered as clickable hyperlinked anchors.

---

## 7. Success Metrics (Hackathon Evaluation)

| Metric | Target | Measurement Method |
| :--- | :--- | :--- |
| **Deterministic Engine Latency** | < 1,000 ms (P95) | FastAPI request duration timing on `/api/v1/scans/*` without AI |
| **End-to-End Latency with AI** | < 15,000 ms (P95) | Total response duration including LLM invocation |
| **Fallback Reliability** | 100% graceful fallback | Synthetic test forcing LLM timeout returns valid ThreatReport |
| **Core Indicator Coverage** | >= 25 URL, >= 20 Message | Count of implemented indicator detection rules in security engine |
| **Zero SSRF Vulnerabilities** | 0 outbound user requests | Network egress packet inspection during scanning tests |
| **Accessibility Compliance** | WCAG 2.1 AA | Lighthouse / Axe DevTools accessibility audit score >= 90 |

---

## 8. Document Cross-References

- [User Personas and Stories](file:///docs/requirements/user-stories.md)
- [Scope Matrix](file:///docs/requirements/scope-matrix.md)
- [Non-Functional Requirements](file:///docs/requirements/non-functional-requirements.md)
- [Risk Scoring Specification](file:///docs/architecture/risk-scoring-spec.md)
- [System Architecture](file:///docs/architecture/architecture.md)
