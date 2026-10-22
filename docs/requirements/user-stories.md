# CIPHER AI — User Personas and User Stories

| Metadata | Details |
| :--- | :--- |
| **Title** | User Personas and User Stories |
| **Phase** | PHASE_01: Requirements, Scope, Architecture, and Technical Specification |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior Software Architect & Technical Product Analyst |

---

## 1. User Personas

### Persona 1: Alex Rivera (Non-Technical Consumer)
- **Profile:** 34, marketing specialist. Relies heavily on mobile devices for banking, shopping, and social networking.
- **Pain Point:** Frequently receives SMS package delivery alerts and urgent account warnings. Finds raw URLs confusing and feels overwhelmed by technical security jargon.
- **Goal:** Quickly paste a link or text snippet into CIPHER AI on mobile and immediately understand whether it is a scam and what steps to take next.

### Persona 2: Marcus Vance (Small Business Owner)
- **Profile:** 48, owner of a boutique accounting firm with 8 staff members. Manages client invoices and payroll.
- **Pain Point:** Targeted by spoofed vendor emails requesting urgent bank routing number updates and fake invoices.
- **Goal:** Verify suspicious communications without expensive enterprise security appliances, protecting company funds from wire fraud.

### Persona 3: Elena Chen (IT Helpdesk Analyst)
- **Profile:** 27, frontline IT support engineer at a mid-sized healthcare provider.
- **Pain Point:** Staff submit dozens of suspicious ticket links daily. Elena needs an explainable, objective indicator breakdown so she can rapidly triage tickets and educate users.
- **Goal:** Review evidence-based indicators and exportable threat reports with transparent point breakdowns to justify domain-blocking tickets.

### Persona 4: Jordan Taylor (Security Student / Threat Researcher)
- **Profile:** 22, computer science undergraduate specializing in cybersecurity.
- **Pain Point:** Most consumer tools are black-box "safe/unsafe" widgets that conceal underlying technical signals like homoglyphs, punycode, or subdomains.
- **Goal:** Analyze the exact lexical indicators, structural anomalies, and defanged URL representations while ensuring safe handling with zero execution risk.

---

## 2. User Stories Catalog

### Core Scanning Stories (MVP)

#### US-001: Submit Suspicious URL
- **Persona:** Alex Rivera (Consumer)
- **Priority:** MVP
- **Story:** *As a consumer, I want to submit a suspicious link into the web scanner, so that I can find out if it exhibits deceptive or malicious patterns.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* a user is on the URL scan page, *When* they paste a well-formed URL (`https://login.paypal.verify-account[.]com`) and click "Analyze URL", *Then* the system returns a comprehensive `ThreatReport` displaying risk score, risk level, and triggered indicators within 15 seconds.
  - **AC-2:** *Given* a valid URL submission, *When* the report is rendered, *Then* the URL is displayed in defanged form (`hxxps://...`) and is not clickable.

#### US-002: Submit Suspicious Scam Message
- **Persona:** Marcus Vance (Small Business Owner)
- **Priority:** MVP
- **Story:** *As a small business owner, I want to paste a suspicious SMS or email body into the message analyzer, so that I can determine if it contains high-pressure scam or payment manipulation tactics.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* a user submits a 350-character text message requesting urgent gift-card payment, *When* the user initiates the scan, *Then* the backend analyzes the message and returns indicators identifying urgency and gift-card payment lure.
  - **AC-2:** *Given* the message analysis completes, *Then* the raw message is not stored in plain text in the database, preserving privacy while displaying a truncated preview on the report.

#### US-003: Understand Threat Drivers via Score Breakdown
- **Persona:** Elena Chen (IT Helpdesk Analyst)
- **Priority:** MVP
- **Story:** *As an IT helpdesk analyst, I want to review an itemized score contribution table, so that I can explain to an employee exactly why a submitted link was flagged as high risk.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* a completed scan report, *When* the user views the score breakdown section, *Then* every score contribution lists its specific `indicator_id`, points added, evidence kind (`observed`, `inferred`), and a clear human-readable reason.
  - **AC-2:** *Given* multiple indicators triggered in the same category, *When* the category cap is exceeded, *Then* the table clearly indicates which contributions were capped.

#### US-004: Receive Plain-Language AI Threat Explanation
- **Persona:** Alex Rivera (Consumer)
- **Priority:** MVP
- **Story:** *As a consumer, I want a concise, non-technical explanation of the threat, so that I understand what the attacker is trying to accomplish without deciphering security jargon.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* a high-risk URL scan, *When* the threat report is displayed, *Then* the AI explanation panel displays a summary under 600 characters citing key findings that explicitly reference observed indicator IDs.
  - **AC-2:** *Given* the explanation is rendered, *Then* it includes a distinct badge indicating it was generated by AI, along with notes addressing analysis uncertainty.

#### US-005: Prioritized Recommended Actions
- **Persona:** Marcus Vance (Small Business Owner)
- **Priority:** MVP
- **Story:** *As a small business owner, I want a prioritized list of concrete defensive actions, so that I know exactly how to protect my accounts if I or an employee already clicked the link.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* a report with risk level `high` or `critical`, *When* viewing the actions section, *Then* the user sees actionable, prioritized instructions (e.g., "Do not enter credentials", "Reset account password immediately via official app").
  - **AC-2:** *Given* an action item, *When* rendered in the UI, *Then* each action displays an imperative verb phrase with a numerical priority rank starting at 1.

#### US-006: View Anonymous Session Scan History
- **Persona:** Elena Chen (IT Helpdesk Analyst)
- **Priority:** MVP
- **Story:** *As an IT helpdesk analyst, I want to see a history table of my recent scans during my active browser session, so that I can compare multiple suspicious links submitted throughout the morning.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* a user has performed three scans in an active session, *When* they navigate to `/history`, *Then* the table lists all three scans with timestamp, defanged target, scan type, risk score, and risk level.
  - **AC-2:** *Given* the user clicks on an entry in the history table, *When* the item is selected, *Then* the web app navigates to `/reports/:reportId` and reloads the full threat report.

#### US-007: Delete Individual Scan from History
- **Persona:** Alex Rivera (Consumer)
- **Priority:** MVP
- **Story:** *As a consumer, I want to delete a specific scan from my history list, so that sensitive messages or accidentally submitted personal notes are permanently removed.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* an existing scan in the user's session history, *When* the user clicks the "Delete" action button and confirms, *Then* the backend marks the record deleted (or removes it) and returns HTTP 204.
  - **AC-2:** *Given* the scan was deleted, *When* the user refreshes the history page, *Then* the deleted record no longer appears in the table.

#### US-008: Reject Invalid URL Input with Helpful Guidance
- **Persona:** Alex Rivera (Consumer)
- **Priority:** MVP
- **Story:** *As a consumer, I want clear validation feedback if I accidentally enter an invalid link or empty text, so that I can correct my mistake without seeing raw server crashes.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* a user submits `not-a-valid-url`, *When* the form is submitted, *Then* the UI and API return a structured validation error (`INVALID_URL` or `VALIDATION_ERROR`) stating why the input failed.
  - **AC-2:** *Given* a user submits a URL exceeding 2,048 characters, *When* submitted, *Then* the system rejects the request with HTTP 413 and code `INPUT_TOO_LARGE`.

#### US-009: Handle AI Provider Outage via Deterministic Fallback
- **Persona:** Elena Chen (IT Helpdesk Analyst)
- **Priority:** MVP
- **Story:** *As an IT helpdesk analyst, I want the scanner to continue operating seamlessly even if the third-party LLM service experiences an outage or timeout, so that my security triage workflow is never blocked.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* the upstream LLM API times out after 15 seconds or responds with an HTTP error, *When* the threat report is assembled, *Then* the backend automatically populates the `ai_explanation` using the deterministic template engine.
  - **AC-2:** *Given* fallback is used, *When* viewing the report, *Then* `processing.ai_status` is set to `fallback_used` and the UI displays the fallback explanation without raising a 500 error.

#### US-010: Transparent Handling of Inconclusive Results
- **Persona:** Jordan Taylor (Security Researcher)
- **Priority:** MVP
- **Story:** *As a security researcher, I want to be explicitly informed when an input cannot be meaningfully evaluated, so that I never mistake an unanalyzable string for a clean asset.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* a user submits an ambiguous 3-character string like `"hey"`, *When* analyzed, *Then* the engine assigns the risk level `inconclusive` rather than `low`.
  - **AC-2:** *Given* an inconclusive result, *When* rendered in the UI, *Then* the report prominently displays the mandatory notice: *"CIPHER AI could not perform a conclusive evaluation... This result does not imply that the content is benign."*

#### US-011: Mobile-Responsive Scanning and Report Inspection
- **Persona:** Alex Rivera (Consumer)
- **Priority:** MVP
- **Story:** *As a consumer, I want to use CIPHER AI seamlessly on my smartphone, so that I can inspect suspicious links directly while reading text messages on the go.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* a viewport width of 360px, *When* the user views the scan form and threat report, *Then* all controls, risk gauges, indicators, and buttons stack vertically with zero horizontal scrollbars.
  - **AC-2:** *Given* a mobile touch device, *When* interacting with buttons and form fields, *Then* interactive targets maintain a minimum size of 44x44 CSS pixels.

#### US-012: Dashboard Threat Overview
- **Persona:** Marcus Vance (Small Business Owner)
- **Priority:** MVP
- **Story:** *As a small business owner, I want a visual summary dashboard of recent threats scanned in my organization, so that I can observe trending scam tactics over the past two weeks.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* navigation to `/dashboard`, *When* the page loads, *Then* it queries `/api/v1/dashboard/summary` and renders metric cards (total scans, breakdown by risk level, top 5 indicators) and a 14-day trend chart.
  - **AC-2:** *Given* a session with no scans, *When* loading the dashboard, *Then* it presents a helpful empty state with shortcuts to start a URL or message scan.

#### US-013: Detection of IDN Homoglyphs and Punycode
- **Persona:** Jordan Taylor (Security Researcher)
- **Priority:** MVP
- **Story:** *As a security researcher, I want the URL scanner to detect internationalized domain name (IDN) homoglyphs and punycode strings, so that lookalike domains spoofing major brands are immediately exposed.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* a URL containing Cyrillic 'а' replacing Latin 'a' (`https://pаypal[.]com`), *When* scanned, *Then* the security engine triggers the `URL_HOMOGLYPH_PUNYCODE` indicator and flags the exact spoofed characters.
  - **AC-2:** *Given* the homoglyph indicator triggers, *Then* it adds its designated points towards the domain category cap and lists the finding under observable indicators.

#### US-014: Detection of IP Address Hostnames
- **Persona:** Elena Chen (IT Helpdesk Analyst)
- **Priority:** MVP
- **Story:** *As an IT helpdesk analyst, I want URLs utilizing raw IP addresses instead of registered domain names to be highlighted, so that direct-to-server phishing attempts are immediately flagged.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* a URL with an IPv4 host (`http://192.0.2.14/login`), *When* scanned, *Then* the engine triggers indicator `URL_IP_HOST` with `severity: high`.
  - **AC-2:** *Given* a private, loopback, or metadata IP (e.g., `127.0.0.1` or `169.254.169.254`), *When* submitted, *Then* the lexical analyzer flags internal IP usage without making any network connection to that IP.

#### US-015: Low-Risk Verification with Mandatory Limitation Notice
- **Persona:** Alex Rivera (Consumer)
- **Priority:** MVP
- **Story:** *As a consumer, when I scan an ordinary, well-known domain, I want to see that no threat indicators were detected while clearly understanding that safety is never 100% guaranteed.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* a standard benign URL (`https://www.example.com`), *When* scanned, *Then* the risk score is between 0 and 24, resulting in risk level `low` and verdict label `"Low risk indicators found"`.
  - **AC-2:** *Given* the `low` risk report renders, *Then* the UI prominently displays the exact mandatory limitation: *"No strong indicators were found by CIPHER AI. This does not guarantee that the content is safe."*

---

### Post-MVP User Stories (Optional / Planned)

#### US-016: Authenticated User Account with Supabase Auth
- **Persona:** Marcus Vance (Small Business Owner)
- **Priority:** Post-MVP
- **Story:** *As a business owner, I want to create an account and log in via Supabase Auth, so that my scan history is securely persisted across all my devices.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* an unauthenticated user, *When* they sign up or log in, *Then* the backend validates the Supabase JWT and associates subsequent scans with `owner_type: user` and their `auth.uid()`.
  - **AC-2:** *Given* an authenticated user, *When* querying `/api/v1/scans`, *Then* PostgreSQL Row-Level Security ensures they can only view scans where `owner_id = auth.uid()`.

#### US-017: Group Scans into Investigation Cases
- **Persona:** Elena Chen (IT Helpdesk Analyst)
- **Priority:** Post-MVP
- **Story:** *As an IT helpdesk analyst, I want to create an investigation case and link related URL and message scans to it, so that I can document an ongoing spear-phishing incident.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* an authenticated analyst, *When* they POST to `/api/v1/cases` with a title and linked scan IDs, *Then* a new case record is created linking all specified scans.
  - **AC-2:** *Given* an open case, *When* viewing the case details, *Then* the analyst can append timestamped investigator notes (`CaseNote`).

#### US-018: Ingest Third-Party Reputation Feeds
- **Persona:** Jordan Taylor (Security Researcher)
- **Priority:** Post-MVP
- **Story:** *As a security researcher, I want external threat feeds (e.g., Safe Browsing) to enrich the scan report, so that established global blocklist statuses are shown alongside local heuristics.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* third-party lookups are enabled, *When* a domain is queried, *Then* results are appended as `ExternalEvidence` records with provider name, checked timestamp, and status.
  - **AC-2:** *Given* an external lookup returns `not_flagged`, *When* score is calculated, *Then* the external result adds zero points and never reduces the deterministic risk score.

#### US-019: Analyze Raw Email Files (.eml)
- **Persona:** Elena Chen (IT Helpdesk Analyst)
- **Priority:** Post-MVP
- **Story:** *As an IT helpdesk analyst, I want to upload an `.eml` email file, so that CIPHER AI can parse the headers (SPF, DKIM, DMARC), email body, and embedded attachments.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* an uploaded RFC 822 `.eml` file, *When* processed, *Then* the backend extracts sender headers, checks authentication alignment, scans embedded links, and produces an email threat report.
  - **AC-2:** *Given* failed SPF or DKIM alignment, *When* evaluated, *Then* specific email authentication indicators are triggered with designated score contributions.

#### US-020: Export Investigation Threat Report to PDF
- **Persona:** Marcus Vance (Small Business Owner)
- **Priority:** Post-MVP
- **Story:** *As a business owner, I want to download a formatted PDF threat report, so that I can submit it as evidence to our cyber-insurance carrier and banking partner.*
- **Acceptance Criteria:**
  - **AC-1:** *Given* a completed scan report, *When* the user clicks "Export PDF", *Then* the system generates a printable document containing report ID, defanged target, score breakdown, and AI summary.
  - **AC-2:** *Given* the PDF export, *When* rendered, *Then* the mandatory disclaimer and timestamped engine version are clearly visible in the header and footer.

---

## 3. Document Cross-References

- [Product Requirements Document](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/requirements/PRD.md)
- [Scope Matrix](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/requirements/scope-matrix.md)
- [Testing & QA Strategy (Traceability Matrix)](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/testing/test-strategy.md)
- [Risk Scoring Specification](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/architecture/risk-scoring-spec.md)
