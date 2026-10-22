# CIPHER AI — Risk-Scoring Specification and Indicator Catalog

| Metadata | Details |
| :--- | :--- |
| **Title** | Risk-Scoring Specification and Indicator Catalog |
| **Phase** | PHASE_01: Requirements, Scope, Architecture, and Technical Specification |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Date** | 2026-10-22 |
| **Owner Role** | Senior Security Engineer & Architect |

---

## 1. Scoring Model Overview

The CIPHER AI threat scoring model is **additive, bounded, explainable, and deterministic**. The numeric score is strictly computed by the security engine from concrete findings. The LLM explains and summarizes findings but is mathematically incapable of altering the score.

### 1.1 Scoring Formula

$$\text{RawScore} = \sum_{c \in \text{Categories}} \min\left( \sum_{i \in \text{Indicators}_c} \text{points}(i), \text{Cap}_c \right)$$

$$\text{RiskScore} = \text{clamp}(\text{RawScore}, 0, 100)$$

- Every finding generates a `ScoreContribution` containing `indicator_id`, `points`, `reason`, `evidence_kind`, and a boolean `capped` flag indicating whether category capping reduced its effect.
- Points are strictly positive integers for threat indicators. Mitigating factors (such as established high-reputation domains without anomalies) may introduce explicitly bounded negative points, but cannot reduce the score below 0.

---

## 2. Thresholds, Levels, and Confidence Rules

### 2.1 Risk Level Thresholds

| Risk Level | Score Range | Verdict Label | UI Color Token | Icon | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Low** | 0 – 24 | `Low risk indicators found` | Teal / Green | `ShieldCheck` | No strong threat indicators detected. Must display mandatory limitation text. |
| **Medium** | 25 – 49 | `Suspicious patterns detected` | Amber | `ShieldAlert` | Heuristic or structural anomalies detected. Caution recommended. |
| **High** | 50 – 74 | `High risk indicators identified` | Orange | `AlertTriangle` | Multiple corroborated indicators of deception or phishing. |
| **Critical** | 75 – 100 | `Critical threat indicators identified` | Red | `AlertOctagon` | High-confidence malicious patterns, active credential harvesting, or direct threat. |
| **Inconclusive** | N/A | `Evaluation inconclusive` | Slate / Gray | `HelpCircle` | Insufficient, malformed, or unparsable input. Never coerced to Low or Safe. |

### 2.2 Inconclusive Conditions
An assessment is marked `inconclusive` if:
1. URL parser fails to parse standard scheme or host structure.
2. Message input length is below 5 characters or contains only whitespace/non-printable characters.
3. All internal security analyzers fail with internal unhandled exceptions.
4. Input language is unsupported and contains zero extractable lexical tokens or URLs.

> **Rule:** An `inconclusive` result has `risk_score = 0` (or `null` in internal representations) and `risk_level = "inconclusive"`. It **must never** be coerced to `low` or labeled safe.

### 2.3 Confidence Metric Calculation
Confidence (`low`, `medium`, `high`) measures evidence sufficiency and quality, independent of the risk score:
- **High Confidence:** >= 3 corroborating indicators triggered across >= 2 distinct categories, OR authoritative external evidence present.
- **Medium Confidence:** 1 to 2 indicators triggered, OR input length and structure are fully parsed without ambiguity.
- **Low Confidence:** 0 indicators found on an asset with no external corroboration, OR short input (< 20 characters) with minimal observable context.

### 2.4 External Evidence Rule
External threat database queries (Phase 08+) produce `ExternalEvidence`:
- `flagged`: Adds a bounded contribution (+25 to +40 points) to the `reputation` category.
- `not_flagged` or `unknown`: Adds exactly **0 points**. It **never reduces the score**.
- Note requirement: Must always state *"A status of not_flagged indicates this asset is not currently listed in external databases; it does not constitute proof of safety."*

### 2.5 Forbidden Claims and Mandatory Limitations
- **Forbidden Claims:** *"This link is safe"*, *"This message is 100 percent legitimate"*, *"No threat exists"*.
- **Mandatory Limitation Notice:**  
  *"No strong indicators were found by CIPHER AI. This does not guarantee that the content is safe."*

---

## 3. Indicator Categories and Category Caps

| Category Code | Description | Default Category Cap |
| :--- | :--- | :--- |
| `url_structure` | Syntactic anomalies, ports, length, encodings, userinfo, scheme. | **35 points** |
| `domain` | Hostname anomalies, excessive subdomains, suspicious TLDs, IP hosts. | **45 points** |
| `homoglyph` | Punycode, mixed scripts, Cyrillic/Greek substitutions, confusable characters. | **40 points** |
| `redirect_shortener` | Known shortening services, nested redirect patterns, hop anomalies. | **25 points** |
| `credential_lure` | Login/auth keywords in path or text, password reset themes, credential forms. | **45 points** |
| `urgency` | Artificial time limits, threat of account suspension, immediate action demands. | **30 points** |
| `impersonation` | Bank, brand, government, delivery service, or tech support mimicry. | **40 points** |
| `payment_request` | Wire transfer requests, gift cards, crypto addresses, invoice manipulation. | **40 points** |
| `contact_channel` | Requests to move communication to WhatsApp, Telegram, or secondary SMS. | **20 points** |
| `attachment` | Suspicious attachment lures, macro warnings, malicious file extensions. | **25 points** |
| `reputation` | Third-party blocklist or reputation intelligence hits (post-MVP). | **40 points** |
| `other` | Miscellaneous behavioral or lexical heuristics. | **20 points** |

---

## 4. URL Indicator Catalog (26 Indicators)

| ID | Category | Evidence Kind | Severity | Default Points | Cap | Title | Detection Method / Pseudo-Rule | Known False Positives |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `URL_IP_HOST` | `domain` | `observed` | `high` | 35 | 45 | IP Address Used as Hostname | Hostname matches IPv4 (`^\d{1,3}(\.\d{1,3}){3}$`) or IPv6 regex. | Local development servers (`127.0.0.1`), intranet routers. |
| `URL_HOMOGLYPH_PUNYCODE` | `homoglyph` | `observed` | `critical` | 40 | 40 | Punycode or Lookalike Homoglyph Hostname | Hostname starts with `xn--` or contains mixed Unicode scripts (e.g. Cyrillic in Latin). | Legitimate internationalized domain names in native non-Latin languages. |
| `URL_EXCESSIVE_SUBDOMAINS` | `domain` | `inferred` | `medium` | 15 | 45 | Excessive Subdomain Depth | Hostname contains >= 4 subdomain labels prior to registered domain. | Complex enterprise multi-tenant subdomains (e.g., `a.b.c.corp.example.com`). |
| `URL_VERY_LONG` | `url_structure` | `observed` | `low` | 10 | 35 | Abnormally Long URL | Total URL character length > 120 characters. | Benign deep-link URLs with long tracking query parameters. |
| `URL_USERINFO_PRESENT` | `url_structure` | `observed` | `critical` | 35 | 35 | Embedded Userinfo Credential (@ Symbol) | URL authority component contains `@` (e.g., `https://google.com@evil.com`). | Rare legacy HTTP basic auth links. |
| `URL_NON_STANDARD_PORT` | `url_structure` | `observed` | `medium` | 15 | 35 | Non-Standard Network Port | URL explicitly specifies a port outside 80, 443, 8080, 8443. | Legitimate staging or custom administrative web consoles. |
| `URL_SHORTENER_DOMAIN` | `redirect_shortener` | `observed` | `medium` | 20 | 25 | URL Shortening Service Detected | Domain matches curated shortener list (`bit.ly`, `tinyurl.com`, `t.co`, etc.). | Legitimate marketing or social media character-reduction links. |
| `URL_SUSPICIOUS_TLD` | `domain` | `inferred` | `medium` | 20 | 45 | High-Risk or Abused Top-Level Domain | Domain TLD matches known high-abuse extensions (`.zip`, `.mov`, `.top`, `.tk`, `.xyz`, `.click`). | Legitimate low-cost startups using generic modern TLDs. |
| `URL_BRAND_IN_SUBDOMAIN` | `impersonation` | `inferred` | `high` | 30 | 40 | Brand Target in Subdomain | Subdomain contains major brand token (`paypal`, `apple`, `microsoft`, `chase`) while registered domain is unrelated. | Legitimate partner integrations or CDN hostnames referencing brands. |
| `URL_CREDENTIAL_PATH_KEYWORD` | `credential_lure` | `inferred` | `high` | 25 | 45 | Credential Keywords in Path | URL path contains `/login`, `/signin`, `/verify`, `/account-update`, `/banking`. | Legitimate direct login pages on unknown domains. |
| `URL_HEX_ENCODED_CHARS` | `url_structure` | `observed` | `medium` | 15 | 35 | Excessive URL Hex-Encoding | Path or query string contains >= 3 percent-encoded characters (`%20`, `%2e`, `%2f`). | Complex international search queries or UTF-8 parameter payloads. |
| `URL_DATA_OR_SCRIPT_SCHEME` | `url_structure` | `observed` | `critical` | 35 | 35 | Dangerous Data or Script Scheme | Scheme matches `data:`, `javascript:`, `vbscript:`, or `blob:`. | Legitimate inline data URLs in web development previews. |
| `URL_DOUBLE_EXTENSION_PATH` | `url_structure` | `observed` | `high` | 25 | 35 | Double File Extension in Path | Path ends with patterns like `.pdf.exe`, `.invoice.zip`, `.doc.vbs`. | Rare legitimate documentation naming conventions (`file.tar.gz`). |
| `URL_LOOKALIKE_CHAR_SUBST` | `homoglyph` | `inferred` | `high` | 25 | 40 | Leetspeak or Digit-Letter Substitution | Hostname replaces letters with lookalike numbers (e.g., `paypa1`, `m1crosoft`, `g00gle`). | Intentional stylized startup brand names. |
| `URL_NO_HTTPS` | `url_structure` | `observed` | `low` | 10 | 35 | Insecure Plaintext HTTP Scheme | URL scheme is `http://` instead of `https://`. | Legacy educational, internal network, or local intranet portals. |
| `URL_MULTIPLE_AT_SYMBOLS` | `url_structure` | `observed` | `critical` | 30 | 35 | Multiple @ Delimiters | Authority or path contains multiple `@` characters for parser confusion. | Invalid syntax test links. |
| `URL_ZERO_WIDTH_CHARS` | `homoglyph` | `observed` | `critical` | 35 | 40 | Hidden Zero-Width Characters | Host or path contains Unicode zero-width space (`U+200B`, `U+200C`, `U+FEFF`). | Copy-paste artifacts from rich text editors. |
| `URL_SUSPICIOUS_FILE_EXT` | `url_structure` | `observed` | `high` | 25 | 35 | Executable or Script File Extension | Path ends with `.exe`, `.scr`, `.bat`, `.cmd`, `.ps1`, `.msi`, `.apk`. | Open-source software binary download mirrors. |
| `URL_TARGET_IN_QUERY_PARAM` | `redirect_shortener` | `inferred` | `medium` | 15 | 25 | Open Redirect Parameter Present | Query string contains parameters like `?url=`, `?redirect=`, `?next=`, `?dest=http`. | Legitimate OAuth return-to or SSO redirection handlers. |
| `URL_HYPHENS_IN_DOMAIN` | `domain` | `observed` | `low` | 10 | 45 | Multiple Hyphens in Registered Domain | Registered domain contains >= 3 hyphens (e.g., `secure-login-account-verify.com`). | Multi-word business domain names. |
| `URL_DYNAMIC_DNS_HOST` | `domain` | `inferred` | `high` | 25 | 45 | Dynamic DNS Provider Hostname | Domain matches dynamic DNS provider (`duckdns.org`, `no-ip.biz`, `ngrok.io`). | Legitimate developer webhooks and staging tunnels. |
| `URL_EMBEDDED_IP_IN_HEX` | `domain` | `observed` | `high` | 30 | 45 | Dotted Hex or Dword IP Address | Hostname utilizes decimal (`http://2130706433`) or octal IP obfuscation. | Obscure legacy test setups. |
| `URL_BRAND_IN_PATH_UNRELATED`| `impersonation` | `inferred` | `medium` | 20 | 40 | Brand Keyword in Path on Unrelated Domain | Brand name appears in deep path (e.g., `randomsite.com/wells-fargo/secure`). | News articles or discussion forums reviewing the brand. |
| `URL_SUSPICIOUS_QUERY_KEYWORD`| `credential_lure` | `inferred` | `medium` | 15 | 45 | Credential Queries in Search String | Query params contain `password=`, `pass=`, `token=`, `session_key=`. | Poorly architected legacy web applications. |
| `URL_NUMERIC_ONLY_SUBDOMAIN` | `domain` | `observed` | `low` | 10 | 45 | Purely Numeric Subdomain | Subdomain label is purely numeric (e.g., `12345.example.com`). | Server cluster node identifiers. |
| `URL_WHITESPACE_OBFUSCATION` | `url_structure` | `observed` | `medium` | 15 | 35 | Obfuscated Whitespace Characters | URL contains embedded tab (`\t`), newline (`\n`), or carriage return (`\r`). | Malformed copy-pasted text strings. |

---

## 5. Message Indicator Catalog (21 Indicators)

| ID | Category | Evidence Kind | Severity | Default Points | Cap | Title | Detection Method / Pseudo-Rule | Known False Positives |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `MSG_URGENCY_DEADLINE` | `urgency` | `observed` | `medium` | 20 | 30 | Artificial Urgency or Strict Deadline | Message matches `"within 24 hours"`, `"immediate action required"`, `"act now"`, `"final notice"`. | Legitimate flash sales, calendar meeting reminders, billing receipts. |
| `MSG_ACCOUNT_CLOSURE_THREAT` | `urgency` | `observed` | `high` | 25 | 30 | Threat of Account Suspension or Closure | Message contains `"account will be closed"`, `"suspended permanently"`, `"terminated"`. | Legitimate policy violation warnings from real services. |
| `MSG_CREDENTIAL_REQUEST` | `credential_lure` | `observed` | `critical` | 35 | 45 | Direct Request for Account Credentials | Message requests `"enter your password"`, `"verify your passphrase"`, `"confirm login details"`. | Legitimate password reset onboarding flows (rarely requesting password over plain message). |
| `MSG_OTP_PIN_REQUEST` | `credential_lure` | `observed` | `critical` | 40 | 45 | Request for Two-Factor OTP or SMS Code | Message asks user to `"share the 6-digit code"`, `"forward OTP"`, `"send verification PIN"`. | Legitimate automated verification messages (usually explicitly say DO NOT SHARE). |
| `MSG_PAYMENT_GIFT_CARD` | `payment_request` | `observed` | `critical` | 35 | 40 | Demand for Gift Card Payment | Message mentions buying or sending `"iTunes card"`, `"Google Play card"`, `"Amazon gift card"`, `"Steam card"`. | Actual gift exchanges or birthday present conversations. |
| `MSG_CRYPTO_PAYMENT` | `payment_request` | `observed` | `high` | 30 | 40 | Cryptocurrency Payment Demand | Message includes Bitcoin/Ethereum wallet addresses (`1[a-km-zA-HJ-NP-Z1-9]{25,34}`, `0x[a-fA-F0-9]{40}`) or demands crypto. | Legitimate cryptocurrency invoices or peer-to-peer hobbyist transfers. |
| `MSG_PRIZE_LOTTERY_CLAIM` | `other` | `inferred` | `high` | 25 | 20 | Unsolicited Prize or Lottery Winnings | Message claims `"you won $1,000,000"`, `"lottery prize claim"`, `"selected as the lucky winner"`. | Legitimate sweepstakes notifications from entered contests. |
| `MSG_BANK_IMPERSONATION` | `impersonation` | `inferred` | `high` | 30 | 40 | Financial Institution Impersonation | Claims to represent Bank of America, Chase, Wells Fargo, PayPal without verified origin. | Legitimate transactional SMS notifications from bank shortcodes. |
| `MSG_DELIVERY_IMPERSONATION` | `impersonation` | `inferred` | `medium` | 20 | 40 | Package Delivery Exception Scam | Claims to be USPS, UPS, FedEx, DHL: `"undelivered package"`, `"incomplete address"`, `"redelivery fee"`. | Legitimate package tracking alerts. |
| `MSG_GOV_AGENCY_IMPERSONATION`| `impersonation` | `inferred` | `critical` | 35 | 40 | Law Enforcement or Tax Agency Spoofing | Claims to be IRS, FBI, SSA, HMRC: `"arrest warrant"`, `"tax refund pending"`, `"unpaid tax penalty"`. | Official government agency notices (almost never sent via SMS). |
| `MSG_TECH_SUPPORT_IMPERSONATION`| `impersonation` | `inferred` | `high` | 30 | 40 | Tech Support or Virus Alert | Claims `"Windows infected"`, `"call Microsoft support"`, `"Trojan spyware detected"`. | Legitimate IT department system maintenance notifications. |
| `MSG_EMBEDDED_SHORT_LINK` | `redirect_shortener` | `observed` | `medium` | 20 | 25 | Message Contains Shortened URL | Message text includes shortened link (`bit.ly/`, `tinyurl.com/`, `t.co/`). | Legitimate marketing broadcasts using link shorteners. |
| `MSG_SENDER_DOMAIN_MISMATCH` | `impersonation` | `inferred` | `high` | 30 | 40 | Claimed Identity Mismatches Link Domain | Message claims to be from Bank X but includes URL pointing to unrelated third-party domain. | Legitimate third-party service provider links (e.g. DocuSign). |
| `MSG_OFF_PLATFORM_REDIRECT` | `contact_channel` | `observed` | `medium` | 15 | 20 | Urges Movement to External Chat App | Requests to move communication to WhatsApp, Telegram, or personal email: `"message me on WhatsApp"`. | Informal business contacts suggesting alternative communications. |
| `MSG_AUTHORITY_POOR_GRAMMAR` | `other` | `inferred` | `medium` | 15 | 20 | Severe Grammar Defects in Formal Context | High spelling and syntax error density paired with formal institutional claims. | Non-native English speakers communicating legitimate requests. |
| `MSG_ATTACHMENT_LURE` | `attachment` | `observed` | `medium` | 20 | 25 | Suspicious Attachment Directive | Directs recipient to `"open attached invoice"`, `"enable macros to view"`, `"extract zip"`. | Legitimate accounting emails transmitting monthly PDF statements. |
| `MSG_ADVANCE_FEE_419` | `payment_request` | `inferred` | `high` | 30 | 40 | Advance-Fee Inheritance / Investment | Mentions inheritance funds, dormant accounts, overseas transfers: `"beneficiary of $5.5 million"`. | Novel writing or fiction discussion snippets. |
| `MSG_JOB_OFFER_UNSOLICITED` | `other` | `inferred` | `medium` | 20 | 20 | Unrealistic Work-From-Home Job Offer | Unsolicited offer promising `"$500/day for 1 hour of remote work"` with no interview. | Legitimate recruitment outreach from staffing agencies. |
| `MSG_SEXTORTION_BLACKMAIL` | `urgency` | `observed` | `critical` | 35 | 30 | Blackmail or Webcam Extortion Threat | Claims to have recorded user via webcam, demanding payment within 48 hours to avoid exposure. | Security awareness testing drills. |
| `MSG_CHARITY_DISASTER_SCAM` | `payment_request` | `inferred` | `medium` | 20 | 40 | Unverified Crisis Relief Donation | Urgent appeals for disaster donations via non-standard peer-to-peer payment methods. | Legitimate grassroots community fundraisers. |
| `MSG_REFUND_OVERPAYMENT` | `payment_request` | `inferred` | `high` | 25 | 40 | Accidental Overpayment Refund Scam | Claims to have accidentally overpaid user, asking user to refund difference via gift card or wire. | Legitimate customer service refund discussions. |

---

## 6. Ten Worked Scoring Examples

Below are 10 complete, mathematically verified scoring examples. Each example details the input, triggered indicators, individual points, category totals and caps, clamped score, resulting risk level, and confidence.

---

### Example 1 (URL): High-Risk Phishing Link with IP Host and Login Path
- **Input URL:** `http://192.0.2.14:8080/secure/login/verify.php`
- **Triggered Indicators & Score Breakdown:**
  1. `URL_IP_HOST` (Category: `domain`, Observed): +35 pts
  2. `URL_NON_STANDARD_PORT` (Category: `url_structure`, Observed): +15 pts
  3. `URL_NO_HTTPS` (Category: `url_structure`, Observed): +10 pts
  4. `URL_CREDENTIAL_PATH_KEYWORD` (Category: `credential_lure`, Inferred): +25 pts
- **Category Cap Calculations:**
  - `domain`: 35 (Cap: 45) -> 35
  - `url_structure`: 15 + 10 = 25 (Cap: 35) -> 25
  - `credential_lure`: 25 (Cap: 45) -> 25
- **Mathematical Aggregation:**
  - Raw Total = 35 + 25 + 25 = 85
  - Clamped Risk Score = $\min(85, 100) = \mathbf{85}$
- **Assessment Verdict:**
  - `risk_score`: **85**
  - `risk_level`: **`critical`** (75–100)
  - `confidence`: **`high`** (4 indicators across 3 categories)
  - `verdict_label`: `"Critical threat indicators identified"`

---

### Example 2 (URL): Punycode Homoglyph Spoofing PayPal
- **Input URL:** `https://xn--pypal-4ve[.]com/account-verification`
- **Triggered Indicators & Score Breakdown:**
  1. `URL_HOMOGLYPH_PUNYCODE` (Category: `homoglyph`, Observed): +40 pts
  2. `URL_CREDENTIAL_PATH_KEYWORD` (Category: `credential_lure`, Inferred): +25 pts
- **Category Cap Calculations:**
  - `homoglyph`: 40 (Cap: 40) -> 40
  - `credential_lure`: 25 (Cap: 45) -> 25
- **Mathematical Aggregation:**
  - Raw Total = 40 + 25 = 65
  - Clamped Risk Score = $\min(65, 100) = \mathbf{65}$
- **Assessment Verdict:**
  - `risk_score`: **65**
  - `risk_level`: **`high`** (50–74)
  - `confidence`: **`high`** (Corroborated homoglyph with credential lure)
  - `verdict_label`: `"High risk indicators identified"`

---

### Example 3 (URL): Deceptive Subdomain Brand Impersonation on Suspicious TLD
- **Input URL:** `http://chase-security.online-banking-portal[.]top/login`
- **Triggered Indicators & Score Breakdown:**
  1. `URL_BRAND_IN_SUBDOMAIN` (Category: `impersonation`, Inferred): +30 pts
  2. `URL_SUSPICIOUS_TLD` (Category: `domain`, Inferred): +20 pts
  3. `URL_HYPHENS_IN_DOMAIN` (Category: `domain`, Observed): +10 pts
  4. `URL_CREDENTIAL_PATH_KEYWORD` (Category: `credential_lure`, Inferred): +25 pts
  5. `URL_NO_HTTPS` (Category: `url_structure`, Observed): +10 pts
- **Category Cap Calculations:**
  - `impersonation`: 30 (Cap: 40) -> 30
  - `domain`: 20 + 10 = 30 (Cap: 45) -> 30
  - `credential_lure`: 25 (Cap: 45) -> 25
  - `url_structure`: 10 (Cap: 35) -> 10
- **Mathematical Aggregation:**
  - Raw Total = 30 + 30 + 25 + 10 = 95
  - Clamped Risk Score = $\min(95, 100) = \mathbf{95}$
- **Assessment Verdict:**
  - `risk_score`: **95**
  - `risk_level`: **`critical`** (75–100)
  - `confidence`: **`high`** (5 indicators across 4 categories)
  - `verdict_label`: `"Critical threat indicators identified"`

---

### Example 4 (URL): URL Shortener with Embedded Credentials in Authority
- **Input URL:** `https://admin:pass@bit[.]ly/3x8Qz99`
- **Triggered Indicators & Score Breakdown:**
  1. `URL_USERINFO_PRESENT` (Category: `url_structure`, Observed): +35 pts
  2. `URL_SHORTENER_DOMAIN` (Category: `redirect_shortener`, Observed): +20 pts
- **Category Cap Calculations:**
  - `url_structure`: 35 (Cap: 35) -> 35
  - `redirect_shortener`: 20 (Cap: 25) -> 20
- **Mathematical Aggregation:**
  - Raw Total = 35 + 20 = 55
  - Clamped Risk Score = $\min(55, 100) = \mathbf{55}$
- **Assessment Verdict:**
  - `risk_score`: **55**
  - `risk_level`: **`high`** (50–74)
  - `confidence`: **`medium`** (2 strong indicators across 2 categories)
  - `verdict_label`: `"High risk indicators identified"`

---

### Example 5 (URL): Benign Standard Domain (Low Risk)
- **Input URL:** `https://www.example[.]com/about/team`
- **Triggered Indicators & Score Breakdown:**
  - *No indicators triggered.*
- **Category Cap Calculations:**
  - All categories = 0
- **Mathematical Aggregation:**
  - Raw Total = 0
  - Clamped Risk Score = $\mathbf{0}$
- **Assessment Verdict:**
  - `risk_score`: **0**
  - `risk_level`: **`low`** (0–24)
  - `confidence`: **`low`** (No negative indicators detected, but no external verification present)
  - `verdict_label`: `"Low risk indicators found"`
  - `limitations`: `["No strong indicators were found by CIPHER AI. This does not guarantee that the content is safe."]`

---

### Example 6 (Message): SMS Urgent Bank Account Suspension Scam
- **Input Message:** `"URGENT: Your Wells Fargo account has been suspended due to unauthorized activity. You must verify within 24 hours at http://bit[.]ly/3abc to prevent permanent closure."`
- **Triggered Indicators & Score Breakdown:**
  1. `MSG_URGENCY_DEADLINE` (Category: `urgency`, Observed): +20 pts
  2. `MSG_ACCOUNT_CLOSURE_THREAT` (Category: `urgency`, Observed): +25 pts *(Urgency total: 45 -> Capped at 30)*
  3. `MSG_BANK_IMPERSONATION` (Category: `impersonation`, Inferred): +30 pts
  4. `MSG_EMBEDDED_SHORT_LINK` (Category: `redirect_shortener`, Observed): +20 pts
- **Category Cap Calculations:**
  - `urgency`: 20 + 25 = 45 -> **Capped at 30** (Excess 15 discarded)
  - `impersonation`: 30 (Cap: 40) -> 30
  - `redirect_shortener`: 20 (Cap: 25) -> 20
- **Mathematical Aggregation:**
  - Raw Total = 30 (capped) + 30 + 20 = 80
  - Clamped Risk Score = $\min(80, 100) = \mathbf{80}$
- **Assessment Verdict:**
  - `risk_score`: **80**
  - `risk_level`: **`critical`** (75–100)
  - `confidence`: **`high`** (4 indicators, cap enforcement verified)
  - `verdict_label`: `"Critical threat indicators identified"`

---

### Example 7 (Message): Fake Delivery Fee with Mismatched Domain
- **Input Message:** `"USPS Notice: Your package could not be delivered due to an incorrect house number. Please update your details and pay the $1.99 redelivery fee: http://usps-parcel-tracking[.]top/update"`
- **Triggered Indicators & Score Breakdown:**
  1. `MSG_DELIVERY_IMPERSONATION` (Category: `impersonation`, Inferred): +20 pts
  2. `MSG_SENDER_DOMAIN_MISMATCH` (Category: `impersonation`, Inferred): +30 pts *(Impersonation total: 50 -> Capped at 40)*
  3. `URL_SUSPICIOUS_TLD` (Category: `domain`, Inferred): +20 pts
- **Category Cap Calculations:**
  - `impersonation`: 20 + 30 = 50 -> **Capped at 40**
  - `domain`: 20 (Cap: 45) -> 20
- **Mathematical Aggregation:**
  - Raw Total = 40 (capped) + 20 = 60
  - Clamped Risk Score = $\min(60, 100) = \mathbf{60}$
- **Assessment Verdict:**
  - `risk_score`: **60**
  - `risk_level`: **`high`** (50–74)
  - `confidence`: **`high`** (Corroborated impersonation and suspicious link)
  - `verdict_label`: `"High risk indicators identified"`

---

### Example 8 (Message): CEO Gift Card Urgency Wire Scam
- **Input Message:** `"Hi Marcus, I am currently in a closed-door meeting and cannot take calls. I need you to urgently buy 5 $100 Apple gift cards for a client presentation and text me the codes right away."`
- **Triggered Indicators & Score Breakdown:**
  1. `MSG_URGENCY_DEADLINE` (Category: `urgency`, Observed): +20 pts
  2. `MSG_PAYMENT_GIFT_CARD` (Category: `payment_request`, Observed): +35 pts
- **Category Cap Calculations:**
  - `urgency`: 20 (Cap: 30) -> 20
  - `payment_request`: 35 (Cap: 40) -> 35
- **Mathematical Aggregation:**
  - Raw Total = 20 + 35 = 55
  - Clamped Risk Score = $\min(55, 100) = \mathbf{55}$
- **Assessment Verdict:**
  - `risk_score`: **55**
  - `risk_level`: **`high`** (50–74)
  - `confidence`: **`medium`** (2 strong indicators across 2 categories)
  - `verdict_label`: `"High risk indicators identified"`

---

### Example 9 (Message): Two-Factor OTP Interception Attack
- **Input Message:** `"Google Security Alert: An unrecognized device logged into your account. To secure your account, reply with the 6-digit verification code we just sent to your phone."`
- **Triggered Indicators & Score Breakdown:**
  1. `MSG_OTP_PIN_REQUEST` (Category: `credential_lure`, Observed): +40 pts
  2. `MSG_TECH_SUPPORT_IMPERSONATION` (Category: `impersonation`, Inferred): +30 pts
- **Category Cap Calculations:**
  - `credential_lure`: 40 (Cap: 45) -> 40
  - `impersonation`: 30 (Cap: 40) -> 30
- **Mathematical Aggregation:**
  - Raw Total = 40 + 30 = 70
  - Clamped Risk Score = $\min(70, 100) = \mathbf{70}$
- **Assessment Verdict:**
  - `risk_score`: **70**
  - `risk_level`: **`high`** (50–74)
  - `confidence`: **`high`** (High severity credential interception pattern)
  - `verdict_label`: `"High risk indicators identified"`

---

### Example 10 (Message): Short Casual Message (Inconclusive)
- **Input Message:** `"Hey"`
- **Triggered Indicators & Score Breakdown:**
  - Length is < 5 characters; meets inconclusive threshold.
- **Category Cap Calculations:**
  - No indicators.
- **Mathematical Aggregation:**
  - Raw Total = 0
  - Clamped Risk Score = $\mathbf{0}$
- **Assessment Verdict:**
  - `risk_score`: **0**
  - `risk_level`: **`inconclusive`**
  - `confidence`: **`low`**
  - `verdict_label`: `"Evaluation inconclusive"`
  - `limitations`: `["Input length is insufficient for meaningful threat pattern analysis."]`

---

## 7. Document Cross-References

- [Glossary and Wording Guide](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/requirements/glossary-and-wording.md)
- [System Architecture](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/architecture/architecture.md)
- [Threat and Abuse Model](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/security/threat-model.md)
- [Testing & QA Strategy](file:///c:/Users/HP/OneDrive/Desktop/CipherAI/docs/testing/test-strategy.md)
