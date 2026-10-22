# CIPHER AI: Incident Response & Operational Runbooks

This document outlines the standard operating procedures, severity levels, and automated recovery runbooks for handling operational incidents in the CIPHER AI production environment.

---

## 1. Incident Severity Classification

| Severity Level | Definition | Target Response SLA | Target Resolution SLA | Example Scenarios |
| :--- | :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Core scanning engine is completely down or returning 500 errors on all requests. | `< 15 minutes` | `< 2 hours` | API crash loop; DNS failure; complete network partition. |
| **SEV-2 (Major)** | Core scanning works, but backing database or AI explanations are completely unavailable. | `< 30 minutes` | `< 4 hours` | Supabase outage; Gemini API quota exhaustion; persistent 429 errors. |
| **SEV-3 (Moderate)** | Non-critical functionality degraded; core single scans unaffected. | `< 2 hours` | `< 1 business day` | External threat reputation provider timeout; slow batch scan processing. |
| **SEV-4 (Minor)** | Minor cosmetic or documentation defects; no impact on security or availability. | `< 1 business day` | Next release cycle | Minor UI alignment defect; non-critical dashboard rendering glitch. |

---

## 2. Operational Runbooks

### Runbook 1: Google Gemini API Outage or Rate Limit (SEV-2)
**Symptoms**:
- `GET /api/v1/metrics` shows high counts of `gemini.breakdown.rate_limit` or `gemini.breakdown.timeout`.
- Reports display: *"Deterministic fallback explanation generated due to provider unavailability."*

**Automated Protection**:
- CIPHER AI's bounded AI layer automatically activates deterministic fallback explanations.
- Single-point failure isolation ensures **no scan is ever blocked or dropped** when Gemini fails.

**Operator Actions**:
1. Check Google AI Studio status dashboard for regional API degradation.
2. Verify account quota at [Google AI Studio](https://aistudio.google.com).
3. Check `LLM_TIMEOUT_SECONDS` in environment variables (default: 12.0s). If network latency is high, temporarily increase to 20.0s.
4. If rate-limited on free tier, rotate `GEMINI_API_KEY` or upgrade to paid tier.
5. If outage is prolonged, disable AI explanations cleanly by setting `AI_ENABLED=false`.

---

### Runbook 2: Supabase Database Connectivity Loss (SEV-2)
**Symptoms**:
- `GET /health` reports `{"dependencies": {"database": "unavailable"}}`.
- Authenticated scans return `persistence_status="save_failed"`.

**Automated Protection**:
- Scans continue processing and return complete threat reports directly in memory.
- `handle_scan_persistence` intercepts database exceptions so users never experience failed scans.

**Operator Actions**:
1. Check Supabase platform status at [status.supabase.com](https://status.supabase.com).
2. Test database REST endpoint reachability:
   ```bash
   curl -I -H "apikey: <SERVICE_ROLE_KEY>" https://<project-ref>.supabase.co/rest/v1/
   ```
3. Check if Supabase project paused due to free-tier inactivity. If paused, unpause from Supabase dashboard.
4. Inspect `scripts/audit_rls.py` to confirm no database schema or RLS policy was modified unexpectedly.

---

### Runbook 3: Spike in 5xx HTTP Errors (SEV-1)
**Symptoms**:
- Cloud hosting alerts trigger on high 5xx error rate.
- `GET /api/v1/metrics` reflects elevated `errors_by_code.INTERNAL_ERROR`.

**Operator Actions**:
1. Pull recent structured JSON access logs from hosting provider (Render / Vercel / CloudWatch).
2. Filter logs by severity:
   ```bash
   grep '"level":"ERROR"' application.log | jq .
   ```
3. Identify offending `request_id` and review the safe traceback.
4. If memory limits were breached, increase container RAM from 512MB to 1GB.
5. If a new deployment introduced a regression, execute an immediate rollback:
   ```bash
   git revert HEAD
   git push origin main
   ```

---

### Runbook 4: SSRF Probing & Abuse Attack (SEV-3)
**Symptoms**:
- Logs show frequent 422 errors with code `INVALID_URL`.
- Repeated requests targeting loopback addresses (`127.0.0.1`), metadata IPs (`169.254.169.254`), or private subnet blocks.

**Automated Protection**:
- The SSRF defense suite in `app/engine/url_validation.py` actively validates and rejects private IP hosts, link-local addresses, and octal/hex obfuscations before any DNS resolution occurs.
- Bounded rate limiting restricts abusive IPs to `RATE_LIMIT_SCANS_PER_MINUTE` (default: 30/min).

**Operator Actions**:
1. Review offending IP addresses in load balancer access logs.
2. If distributed abuse is detected, enable Cloudflare WAF or Render IP ban list.
3. Lower `RATE_LIMIT_SCANS_PER_MINUTE` temporarily via environment variable if capacity is impacted.

---

### Runbook 5: Database Maintenance & Purging Expired Scans
**Procedure**:
1. Scans are retained for `SCAN_RETENTION_DAYS` (default: 90 days).
2. Run the included scheduled purge script weekly via cron or scheduled task:
   ```bash
   python scripts/purge_expired_scans.py --days 90
   ```
3. Verify database storage usage in Supabase dashboard -> **Settings** -> **Database**.

---

## 3. Post-Mortem Incident Template

When a SEV-1 or SEV-2 incident occurs, complete the following post-mortem within 48 hours:

```markdown
# Incident Post-Mortem: [Date] - [Short Description]

## Summary
- **Severity**: SEV-1 | SEV-2
- **Duration**: [Start Time UTC] to [Resolution Time UTC] ([X] minutes)
- **User Impact**: [% of users affected, e.g. 0% scans dropped, AI fallback displayed]

## Root Cause
[Technical explanation of what triggered the failure]

## Timeline (UTC)
- HH:MM - Anomaly detected via health probe / telemetry
- HH:MM - On-call engineer acknowledged incident
- HH:MM - Root cause identified
- HH:MM - Remediation applied
- HH:MM - Health checks verified normal status

## What Went Well
- Deterministic fallback prevented scan failures
- Structured logs provided immediate request_id isolation

## Corrective Actions
- [ ] Action item 1 (Owner, Due Date)
- [ ] Action item 2 (Owner, Due Date)
```
