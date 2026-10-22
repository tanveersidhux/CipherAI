-- =============================================================================
-- CIPHER AI: Database Seed Data (Synthetic Test Fixtures Only)
-- Phase: PHASE_03
-- Note: Contains only clearly synthetic mock data. Never commit production records.
-- =============================================================================

INSERT INTO public.scans (
    id,
    owner_type,
    owner_id,
    scan_type,
    display_value,
    input_hash,
    risk_score,
    risk_level,
    confidence,
    report,
    engine_version,
    ai_status,
    created_at
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'anonymous_session',
    'anon-test-session-001',
    'url',
    'hxxps://secure-bank-login[.]fake-update[.]xyz/verify',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    85,
    'critical',
    'high',
    '{"threat_report_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", "target": {"type": "url", "display_value": "hxxps://secure-bank-login[.]fake-update[.]xyz/verify", "defanged_value": "hxxps://secure-bank-login[.]fake-update[.]xyz/verify", "normalized_value": "https://secure-bank-login.fake-update.xyz/verify", "input_length": 52}, "score": {"risk_score": 85, "risk_level": "critical", "confidence": "high"}, "indicators": [], "score_breakdown": [], "external_evidence": [], "ai_explanation": null, "recommended_actions": [], "meta": {"engine_version": "1.0.0", "ai_status": "disabled", "persisted": true, "created_at": "2026-10-22T12:00:00Z"}}'::jsonb,
    '1.0.0',
    'disabled',
    now()
) ON CONFLICT (id) DO NOTHING;
