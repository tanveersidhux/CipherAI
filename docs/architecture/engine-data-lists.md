# Engine Curated Data Lists Reference

**CIPHER AI — Security Engine Curated Datasets**  
**Location:** `api/app/engine/data/`  
**Validation:** Verified at server startup via `app.engine.data_loader` with strict JSON schema and integrity checks.

---

## 1. Curated Data Files

| File | Purpose | Key Entries / Coverage |
| :--- | :--- | :--- |
| [`brands.json`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/engine/data/brands.json) | High-target brand keywords mapped to authoritative registrable domains. | PayPal, Apple, Microsoft, Google, Chase, Wells Fargo, Bank of America, Amazon, Netflix, USPS, UPS, FedEx, DHL, IRS, Meta. |
| [`shorteners.json`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/engine/data/shorteners.json) | Known public URL redirection and shortening domains. | `bit.ly`, `tinyurl.com`, `t.co`, `is.gd`, `buff.ly`, `ow.ly`, `cutt.ly`, `rb.gy`, `shorturl.at`. |
| [`suspicious_tlds.json`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/engine/data/suspicious_tlds.json) | TLDs statistically overrepresented in phishing and abuse campaigns. | `top`, `xyz`, `click`, `tk`, `ml`, `ga`, `cf`, `gq`, `loan`, `work`, `date`, `racing`, `zip`, `mov`. |
| [`url_keywords.json`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/engine/data/url_keywords.json) | Path tokens and parameter names indicating authentication or open redirects. | `/login`, `/verify`, `/account-update`, `/banking`, `/signin`, `session_key`, `token`, `password`, open redirect params. |
| [`message_phrases.json`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/engine/data/message_phrases.json) | Phrasing heuristics for urgency, threats, payment, lottery, and prompt injection. | Urgency deadlines, account suspension, gift card demands, 2FA code requests, webcam extortion, analyzer manipulation. |

---

## 2. Maintenance & Review Guidelines

1. **Deterministic Matching:** All phrase heuristics are matched against normalized lowercase Unicode NFKC text.
2. **Offline-First:** All data files are bundled inside the repository and version controlled. No external network requests are executed during data loading or runtime matching.
3. **Review Cadence:** Curated brand domains and suspicious TLD lists should be reviewed quarterly to incorporate emerging phishing TLD trends and brand acquisitions.
