# CIPHER AI — Page Layouts and Wireframes Specification

| Metadata | Details |
| :--- | :--- |
| **Title** | Page Layouts and Wireframes Specification |
| **Phase** | PHASE_02: UI/UX Design System, Page Layouts, Navigation, Reusable Components, Responsive Design, and User Flows |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior UI/UX Designer & Frontend Architect |

---

## 1. Overview and Layout System

CIPHER AI layouts adapt seamlessly across three canonical responsive viewport tiers:
1. **Desktop (≥ 1280px):** 240px persistent left sidebar, maximum 1100px centered content area, 2-column or 3-column asymmetric layout with sticky summary panels.
2. **Tablet (768px – 1023px):** Top navigation header with drawer sheet toggle, single-column main content grid, cards stacked vertically.
3. **Mobile (360px – 767px):** Full-bleed single-column layout, bottom navigation bar (5 items), zero horizontal scroll, tables transformed into vertical stacked summary cards, responsive touch targets (minimum 44x44px).

---

## 2. Desktop Wireframes (1280px)

### 2.1 Landing and Quick Scan (`/`)
```
+---------------------------------------------------------------------------------------------------------+
| [Logo] CIPHER AI                                                                           [ThemeToggle]|
+-------------------+-------------------------------------------------------------------------------------+
| [Nav: Home *]     |  HERO SECTION                                                                       |
| [Nav: Scan URL]   |  Tagline: Understand threats. Protect what matters.                                 |
| [Nav: Scan Msg]   |  Sub: Fast, offline-first lexical analysis of suspicious URLs and scam messages.    |
| [Nav: History]    |                                                                                     |
| [Nav: Dashboard]  |  +-------------------------------------------------------------------------------+  |
|                   |  | QUICK SCAN INPUT CARD                                                         |  |
|                   |  | [ Mode Tab: URL Scan (Active) ] [ Mode Tab: Message Scan ]                    |  |
|                   |  | Input: [ Enter suspicious URL (e.g. hxxps://example[.]com/verify)           ] |  |
|                   |  | [ Button: Analyze Threat -> ] (Disabled if empty or invalid)                  |  |
|                   |  +-------------------------------------------------------------------------------+  |
|                   |                                                                                     |
|                   |  TRUST CARDS (3-Column Grid)                                                        |
|                   |  +---------------------+ +----------------------+ +------------------------------+  |
|                   |  | Evidence First      | | Plain Language AI    | | Never Claims 100% Safety     |  |
|                   |  | Deterministic facts | | Transparent synthesis| | Always acknowledges unknown  |  |
|                   |  | before any score    | | with cited indicators| | variables and zero-day risk  |  |
|                   |  +---------------------+ +----------------------+ +------------------------------+  |
|                   |                                                                                     |
| [Settings]        |  RECENT SCANS PREVIEW (Last 3 Scans or Empty CTA)                                   |
+-------------------+-------------------------------------------------------------------------------------+
```

### 2.2 Threat Report Page (`/reports/:reportId`)
```
+---------------------------------------------------------------------------------------------------------+
| [Logo] CIPHER AI   [Back to Scans]                                                         [ThemeToggle]|
+-------------------+-------------------------------------------------------------------------------------+
| [Sidebar Nav]     |  REPORT HEADER: [URL / Message Badge] Display: hxxp://192.0.2.14:8080/login...      |
|                   |  Scanned at: 2026-10-22 15:30:00 UTC | ID: 7f8b9c24... [Copy ID]                   |
|                   |                                                                                     |
|                   |  +-------------------------------------------------------------------------------+  |
|                   |  | RISK SUMMARY BANNER                                                           |  |
|                   |  | [RiskGauge: 85/100]  [RiskBadge: CRITICAL]  Verdict: Critical threat detected |  |
|                   |  | Confidence: HIGH [ConfidenceMeter]                                            |  |
|                   |  +-------------------------------------------------------------------------------+  |
|                   |                                                                                     |
|                   |  +-------------------------------------------------------------------------------+  |
|                   |  | [!] LIMITATIONS & DISCLAIMER BANNER                                           |  |
|                   |  | "No strong indicators were found... / Lexical analysis only; content not fetched"|
|                   |  +-------------------------------------------------------------------------------+  |
|                   |                                                                                     |
|                   |  +-------------------------------------------------------------------------------+  |
|                   |  | AI EXPLANATION PANEL [Badge: AI-Generated / Deterministic Summary]            |  |
|                   |  | Summary: Direct numerical IP address on custom port requesting credentials.   |  |
|                   |  | Key Findings:                                                                 |  |
|                   |  | * Connects directly to IP address [Chip: URL_IP_HOST]                         |  |
|                   |  | * Requests credentials over plaintext [Chip: URL_NO_HTTPS]                    |  |
|                   |  | User Guidance: Do not submit personal data or credentials.                    |  |
|                   |  | Uncertainty Disclosures: Offline analysis without live network verification.  |  |
|                   |  +-------------------------------------------------------------------------------+  |
|                   |                                                                                     |
|                   |  +-------------------------------------------------------------------------------+  |
|                   |  | RECOMMENDED ACTIONS (Numbered, Prioritized)                                   |  |
|                   |  | 1. Do not click or submit information to this address.                        |  |
|                   |  | 2. If passwords were submitted, immediately reset credentials.               |  |
|                   |  +-------------------------------------------------------------------------------+  |
|                   |                                                                                     |
|                   |  +-------------------------------------------------------------------------------+  |
|                   |  | OBSERVABLE INDICATORS (Deterministic Facts)                     [Expand All]  |  |
|                   |  | > URL_IP_HOST: IP Address Used as Hostname [Severity: HIGH]                   |  |
|                   |  | > URL_NON_STANDARD_PORT: Non-Standard Network Port [Severity: MED]           |  |
|                   |  +-------------------------------------------------------------------------------+  |
|                   |                                                                                     |
|                   |  +-------------------------------------------------------------------------------+  |
|                   |  | INFERRED RISK HEURISTICS (Pattern Suspicion)                                  |  |
|                   |  | > URL_CREDENTIAL_PATH_KEYWORD: Login verification keywords [Severity: HIGH]   |  |
|                   |  +-------------------------------------------------------------------------------+  |
|                   |                                                                                     |
|                   |  +-------------------------------------------------------------------------------+  |
|                   |  | EXTERNAL EVIDENCE (Third-Party Reputation Feeds)                              |  |
|                   |  | (Empty / "Not available in this offline MVP version" state)                   |  |
|                   |  +-------------------------------------------------------------------------------+  |
|                   |                                                                                     |
|                   |  +-------------------------------------------------------------------------------+  |
|                   |  | SCORE BREAKDOWN TABLE                                                         |  |
|                   |  | Indicator | Category | Kind | Points | Reason | Capped?                       |  |
|                   |  | URL_IP_HOST | domain | obs  | +35    | Direct IP host | No                    |  |
|                   |  | TOTAL SCORE: 85 / 100 (Clamped)                                               |  |
|                   |  +-------------------------------------------------------------------------------+  |
|                   |                                                                                     |
|                   |  SCAN METADATA: Engine: v1.0.0 | Processing: 1,420ms | AI: used                  |  |
+-------------------+-------------------------------------------------------------------------------------+
```

---

## 3. Tablet Wireframes (768px)

### 3.1 Dashboard Page (`/dashboard`)
```
+---------------------------------------------------------------------------------------------------------+
| [=] CIPHER AI                                                                              [ThemeToggle]|
+---------------------------------------------------------------------------------------------------------+
| DASHBOARD METRICS                                                                                       |
| +--------------------+ +--------------------+ +--------------------+ +-------------------------------+  |
| | Total Scans: 24    | | Critical/High: 10  | | Avg Duration: 1.2s | | Top Indicator: URL_IP_HOST    |  |
| +--------------------+ +--------------------+ +--------------------+ +-------------------------------+  |
|                                                                                                         |
| +-----------------------------------------------------------------------------------------------------+  |
| | RISK DISTRIBUTION (Donut Chart)                                                                     |  |
| | [Text Alternative Available: Low (8), Medium (6), High (7), Critical (3)]                           |  |
| | [ Recharts Donut Canvas ]                                                                           |  |
| +-----------------------------------------------------------------------------------------------------+  |
|                                                                                                         |
| +-----------------------------------------------------------------------------------------------------+  |
| | 14-DAY SCAN TREND (Line/Bar Chart)                                                                  |  |
| | [ Recharts Trend Area Canvas ]                                                                      |  |
| +-----------------------------------------------------------------------------------------------------+  |
|                                                                                                         |
| RECENT SCANS TABLE                                                                                      |
| [ Filter By Level: All v ] [ Filter By Type: All v ]                                                    |
| Date | Target | Type | Risk Level | Actions                                                             |
+---------------------------------------------------------------------------------------------------------+
```

---

## 4. Mobile Wireframes (360px)

### 4.1 Mobile Quick Scan & Report
```
+-----------------------------------+
| [=] CIPHER AI         [ThemeIcon] |
+-----------------------------------+
| CIPHER AI                         |
| Understand threats.               |
| Protect what matters.             |
|                                   |
| [ Scan URL ]  [ Scan Message ]    |
|                                   |
| Enter suspicious URL:             |
| +-------------------------------+ |
| | hxxps://example[.]com         | |
| +-------------------------------+ |
| [ Analyze URL -> (Full Width)   ] |
|                                   |
| +-------------------------------+ |
| | [Gauge: 85] CRITICAL THREAT   | |
| | Verdict: Critical indicators  | |
| | Confidence: HIGH              | |
| +-------------------------------+ |
|                                   |
| [!] DISCLAIMER:                   |
| No strong indicators were found...|
| This does not guarantee safety.   |
|                                   |
| +-------------------------------+ |
| | AI Threat Summary             | |
| | Direct IP with login lure.    | |
| +-------------------------------+ |
|                                   |
| RECOMMENDED ACTIONS:              |
| 1. Do not submit credentials.     |
| 2. Reset password immediately.    |
|                                   |
| +-------------------------------+ |
| | Observable Indicators (2)  v  | |
| +-------------------------------+ |
| | Score Breakdown (85 pts)   v  | |
| +-------------------------------+ |
+-----------------------------------+
| [Home] [URL] [Msg] [Hist] [Dash]  | (Fixed 64px Mobile Nav Bar)
+-----------------------------------+
```

### 4.2 Mobile History Card Transformation
On viewports < 768px, table rows automatically transform into accessible cards:
```
+-----------------------------------+
| SCAN HISTORY                      |
| [ Search input...               ] |
| [ Filter: All Risk Levels v     ] |
|                                   |
| +-------------------------------+ |
| | URL * Oct 22, 2026 15:30 UTC  | |
| | hxxp://192.0.2.14:8080/login  | |
| | [ CRITICAL - 85/100 ]         | |
| | [ View Report ] [ Delete (Trash)]|
| +-------------------------------+ |
| +-------------------------------+ |
| | MSG * Oct 22, 2026 14:15 UTC  | |
| | "URGENT: Your account..."     | |
| | [ HIGH - 65/100 ]             | |
| | [ View Report ] [ Delete (Trash)]|
| +-------------------------------+ |
+-----------------------------------+
```

---

## 5. Print-Friendly Stylesheet Rules
For reports printed or exported to PDF (`@media print`):
- Sidebar, topbar, mobile nav, theme toggles, and copy buttons are hidden (`display: none !important`).
- Background colors default to clean white, borders to thin light gray.
- All collapsible sections (indicators, score breakdown) are forced open.
- Defanged URLs and hashes break cleanly across page boundaries without clipping.
