# CIPHER AI — Privacy Review & Compliance Assessment

| Metadata | Details |
| :--- | :--- |
| **Document** | Privacy Review, Data Minimization & Compliance Audit |
| **Phase** | PHASE_09: Hardening, Threat Model, Privacy Review, and Final Verification |
| **Compliance Standards** | GDPR (Arts. 5, 17, 20), CCPA/CPRA, OWASP Privacy Risks |
| **Date** | 2026-10-23 |
| **Status** | Approved |

---

## 1. Privacy by Design Framework

CIPHER AI is architected from the ground up to protect user privacy while analyzing potentially sensitive or hostile cyber threat artifacts.

```mermaid
graph TD
    Input["User Input (URL, Message, Email)"] --> Ingest["In-Memory Normalization"]
    Ingest --> Hash["Compute SHA-256 Hash"]
    Ingest --> Truncate["Strip Credentials & Truncate (200 chars)"]
    Ingest --> Discard["Discard Attachment Payloads Immediately"]
    
    Hash & Truncate --> Storage[("Database: Scans & Reports")]
    Discard -.-> Zero["Zero Attachment Storage"]
    
    Storage --> Export["Right to Portability (JSON/CSV Export)"]
    Storage --> Purge["Right to Erasure (DELETE /api/v1/me/data)"]
```

---

## 2. Core Privacy Tenets & Implementation Verification

### 2.1 Data Minimization in Threat Intelligence Lookups
- **Policy:** Threat intelligence queries dispatched to external services (VirusTotal, URLhaus, Google Safe Browsing) must not disclose private network topologies, intranet IPs, or user credentials.
- **Implementation:**
  - Embedded credentials (`https://user:password@target.com`) are stripped by `parse_and_validate_url` before analysis.
  - Private, internal, and cloud-metadata addresses (`127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`, `*.internal`) are completely bypassed: [`ReputationService`](file:///c:/Users/mante/OneDrive/Desktop/CipherAI/CipherAI/api/app/services/reputation_service.py) issues **zero outbound requests** for private addresses.
  - VirusTotal lookups query only the 64-character SHA-256 hash representation (`/api/v3/urls/{sha256_hash}`).

### 2.2 Forensic Email Analysis Privacy
- **Policy:** Scanned `.eml` or RFC 822 messages must not leak confidential attachments or personal communications to external storage.
- **Implementation:**
  - Attachments are processed strictly in-memory during forensic inspection.
  - Binary bodies of attachments are never written to disk, object storage, or PostgreSQL.
  - Only non-PII metadata is retained: `filename`, `content_type`, `size_bytes`, `sha256_hash`, and danger indicators (`is_executable`, `risky_extension`).

### 2.3 Zero-Plaintext Message Storage
- **Policy:** Unsolicited messages (SMS, phishing notifications) often contain sensitive phone numbers or personal financial notifications.
- **Implementation:**
  - The backend stores a SHA-256 cryptographic digest of the message.
  - Only a bounded display preview (max 200 characters) is retained in the `scans` table for user reference in the UI.

### 2.4 User Rights: Erasure (GDPR Art. 17) & Portability (GDPR Art. 20)
- **Right to Erasure (Article 17):**
  - Authenticated endpoint `DELETE /api/v1/me/data` requires confirmation payload `{"confirm": "DELETE"}`.
  - Executes a cascade purge that deletes all user scans, evidence rows, AI explanations, investigation cases, case notes, and batch records.
- **Right to Data Portability (Article 20):**
  - `GET /api/v1/scans/{scan_id}/export?format=json` and `GET /api/v1/cases/{case_id}/export?format=json` allow users to download their complete forensic dossiers at any time.

---

## 3. Privacy Review Sign-off

| Principle | Audit Method | Status |
| :--- | :--- | :---: |
| **Lawfulness & Transparency** | Clear advisory disclosures on all scan reports | **PASS** |
| **Purpose Limitation** | Content analyzed exclusively for threat evaluation | **PASS** |
| **Data Minimization** | Full message text omitted; attachments never stored | **PASS** |
| **Accuracy** | Immutable audit timestamps; canonical SHA-256 digests | **PASS** |
| **Storage Limitation** | Automated 90-day retention purge script | **PASS** |
| **Integrity & Confidentiality**| PostgreSQL Row-Level Security on all 11 tables | **PASS** |
