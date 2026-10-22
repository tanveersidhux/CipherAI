/**
 * Realistic ThreatReport and ExplanationResponse Fixtures for Testing.
 */

import type { ThreatReport } from '@/types/threat-report'
import type { ExplanationResponse } from '@/types/explanation'

export const mockHighRiskReport: ThreatReport = {
  report_id: 'rep_high_risk_001',
  schema_version: '1.0',
  engine_version: '1.0.0',
  scan_type: 'url',
  created_at: '2026-10-22T17:00:00.000Z',
  input: {
    display_value: 'hxxps://secure-login[.]example[.]test/verify',
    normalized_value: 'https://secure-login.example.test/verify',
    input_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    input_length: 42,
  },
  assessment: {
    risk_score: 85,
    risk_level: 'high',
    confidence: 'high',
    verdict_label: 'High threat indicators identified: Credential lure keywords detected.',
    limitations: ['Evaluation based solely on offline lexical heuristics.'],
  },
  indicators: [
    {
      indicator_id: 'URL_CREDENTIAL_PATH_KEYWORD',
      category: 'credential_lure',
      evidence_kind: 'observed',
      title: 'Credential Keywords in Path',
      description: 'URL path contains terms commonly associated with credential harvesting ("verify").',
      observed_value: '/verify',
      severity: 'high',
      triggered: true,
    },
    {
      indicator_id: 'URL_SUBDOMAIN_DEPTH',
      category: 'domain',
      evidence_kind: 'observed',
      title: 'Atypical Subdomain Structure',
      description: 'Deep subdomain nesting designed to spoof brand keywords.',
      observed_value: 'secure-login.example.test',
      severity: 'medium',
      triggered: true,
    },
  ],
  score_breakdown: [
    {
      indicator_id: 'URL_CREDENTIAL_PATH_KEYWORD',
      points: 55,
      reason: 'Critical credential harvesting lure pattern.',
      evidence_kind: 'observed',
      capped: false,
    },
    {
      indicator_id: 'URL_SUBDOMAIN_DEPTH',
      points: 30,
      reason: 'Deep subdomain spoofing structure.',
      evidence_kind: 'observed',
      capped: false,
    },
  ],
  external_evidence: [],
  ai_explanation: {
    summary: 'This address mimics a security verification page to lure users into revealing authentication credentials.',
    key_findings: [
      {
        text: 'The path explicitly requests account verification.',
        indicator_ids: ['URL_CREDENTIAL_PATH_KEYWORD'],
      },
    ],
    user_guidance: 'Do not enter credentials or passwords.',
    uncertainty_notes: 'Heuristic evaluation only.',
    generated_by: 'deterministic_fallback',
    model: null,
    validated: true,
  },
  recommended_actions: [
    {
      action_id: 'ACT_DO_NOT_CLICK',
      priority: 1,
      text: 'Do not click or navigate to this destination.',
      applies_to_levels: ['high', 'critical'],
    },
  ],
  processing: {
    duration_ms: 18,
    ai_status: 'disabled',
    external_lookup_status: 'not_attempted',
  },
}

export const mockInconclusiveReport: ThreatReport = {
  ...mockHighRiskReport,
  report_id: 'rep_inconclusive_002',
  assessment: {
    risk_score: 15,
    risk_level: 'inconclusive',
    confidence: 'low',
    verdict_label: 'Inconclusive: not enough information to judge safely.',
    limitations: ['Insufficient observable structural clues to establish a verdict.'],
  },
  indicators: [],
  score_breakdown: [],
}

export const mockHostileTextReport: ThreatReport = {
  ...mockHighRiskReport,
  report_id: 'rep_hostile_003',
  input: {
    ...mockHighRiskReport.input,
    display_value: 'hxxps://test[.]com/<script>alert("xss")</script>',
  },
  assessment: {
    ...mockHighRiskReport.assessment,
    verdict_label: 'Malicious payload <img src=x onerror=alert(1)> and [markdown link](http://evil.com)',
  },
}

export const mockAIExplanationResponse: ExplanationResponse = {
  explanation: {
    summary: 'The inspected URL exhibits deceptive naming structures designed to harvest login credentials.',
    risk_statement: 'High Risk Detected: Do not interact or submit credentials.',
    key_findings: [
      {
        title: 'Deceptive Verification Path',
        detail: 'The resource path /verify mimics an identity verification endpoint.',
        evidence_ids: ['URL_CREDENTIAL_PATH_KEYWORD'],
      },
    ],
    recommended_actions: [
      {
        priority: 'high',
        action: 'Never enter account passwords or security tokens on this domain.',
      },
      {
        priority: 'medium',
        action: 'Report the URL to your organizational IT security team.',
      },
    ],
    confidence: 'high',
    limitations: [
      'Analysis is strictly lexical and offline.',
      'Destination server headers were not retrieved.',
    ],
    disclaimer: 'CIPHER AI evaluations are advisory only and do not guarantee safety or absence of zero-day threats.',
  },
  meta: {
    explanation_source: 'ai',
    model: 'claude-3-5-sonnet-20241022',
    fallback_reason: null,
    prompt_injection_suspected: false,
    latency_ms: 640,
    generated_at: '2026-10-22T17:00:01.000Z',
  },
}

export const mockFallbackExplanationResponse: ExplanationResponse = {
  ...mockAIExplanationResponse,
  meta: {
    explanation_source: 'deterministic_fallback',
    model: null,
    fallback_reason: 'AI_DISABLED',
    prompt_injection_suspected: false,
    latency_ms: 12,
    generated_at: '2026-10-22T17:00:01.000Z',
  },
}

export const mockHostileExplanationResponse: ExplanationResponse = {
  ...mockAIExplanationResponse,
  explanation: {
    ...mockAIExplanationResponse.explanation,
    summary: 'Exploit attempt: <script>alert("pwnd")</script> and [phish link](http://evil.com)',
  },
}
