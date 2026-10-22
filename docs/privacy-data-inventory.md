# CIPHER AI — Privacy Data Inventory & Data Retention Policy

**Phase:** `PHASE_07`  
**Last Updated:** October 2026  
**Applicability:** Scans, Evidence, AI Explanations, Cases, Case Notes, and User Telemetry  

---

## 1. Overview & Data Minimization Principles

CIPHER AI adheres to strict data minimization principles:
1. **Never Store Unnecessary Personal Data:** IP addresses, complete browser user-agents, raw session identifiers, and sensitive query parameters are never persisted to long-term storage.
2. **Redaction by Default for Messages:** Unsolicited messages (SMS, email bodies, chat transcripts) often contain personal phone numbers, bank details, or recipient email addresses. By default, CIPHER AI masks these sensitive patterns and retains at most a 500-character truncated excerpt along with a SHA-256 cryptographic hash of the normalized input for de-duplication. Full text is only retained if the user explicitly opts in via their settings (`store_full_message_text`).
3. **Normalized & Defanged URLs:** Scanned URLs have user credentials (`http://user:password@domain.com`) stripped immediately upon intake. Fragments (`#...`) are removed before storage.
4. **Isolated User Ownership:** All persisted records are tied to the authenticated user's UUID (`user_id = auth.users(id)`). Cross-user access is strictly prevented at the API layer, repository layer, and database Row-Level Security (RLS) policies.

---

## 2. Table-by-Table Data Inventory

| Table Name | Fields Stored | Sensitivity | Redaction / Protection Mechanism |
| :--- | :--- | :--- | :--- |
| **`scans`** | `id`, `user_id`, `scan_type`, `title`, `normalized_input`, `input_hash`, `full_input` (opt-in only), `risk_score`, `risk_level`, `engine_version`, `is_pinned`, `rescan_of_scan_id`, `client_request_id`, `created_at`, `updated_at` | Medium | Credential-stripped for URLs; regex masked & 500-char truncated for messages. Hash is 64-char hex string. |
| **`scan_evidence`** | `id`, `scan_id`, `user_id`, `category`, `indicator`, `is_observed`, `reason`, `score_contribution`, `source`, `observed_at`, `external_reference` | Low | Lexical indicator descriptors and score points. No PII. |
| **`scan_explanations`** | `id`, `scan_id`, `user_id`, `content` (JSONB), `validation_status`, `is_fallback`, `model_name`, `prompt_version`, `generated_at` | Medium | Sanitized summary, findings, and guidance. Raw LLM system prompts or user prompt injection attempts are never stored here. |
| **`cases`** | `id`, `user_id`, `title`, `description`, `status`, `priority`, `created_at`, `updated_at` | Medium | User-entered investigative notes and titles, sanitized for length. |
| **`case_scans`** | `case_id`, `scan_id`, `user_id`, `attached_at` | Low | Relationship junction with enforced same-user ownership. |
| **`case_notes`** | `id`, `case_id`, `user_id`, `body`, `created_at`, `updated_at` | High | User-authored plain text notes up to 5,000 characters. Rendered strictly as escaped text. |
| **`case_events`** | `id`, `case_id`, `user_id`, `event_type`, `reference_id`, `metadata`, `occurred_at` | Low | Audit timeline of state transitions. |
| **`tags` / `scan_tags`** | `id`, `user_id`, `name`, `scan_id`, `tag_id` | Low | Alphanumeric lowercase user labels (max 32 chars). |
| **`user_settings`** | `user_id`, `store_full_message_text`, `retention_days`, `created_at`, `updated_at` | Low | User configuration preferences. |

---

## 3. Data Retention & Purging Policy

- **Default Retention Threshold:** 90 days (configurable via `SCAN_RETENTION_DAYS` environment variable; `0` disables automatic expiration).
- **Automated Cascade:** Deleting a user or invoking account deletion (`DELETE /api/v1/me/data`) cascades completely to:
  - All scans and child evidence rows
  - All stored AI explanations
  - All case attachments and case notes
  - All user settings and tags
- **Maintenance Purge Script:** Provided at `scripts/purge_expired_scans.py` for scheduled execution via cron or cloud worker without blocking user request paths.
