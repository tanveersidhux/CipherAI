import type { ThreatReport } from '@/types/threat-report'
import { MANDATORY_DISCLAIMERS, RISK_LEVEL_LABELS } from '@/lib/content/wording'

export const criticalReportFixture: ThreatReport = {
  report_id: '7f8b9c24-5d12-4c8e-a9b1-3e4f6a7b8c9d',
  schema_version: '1.0',
  scan_type: 'url',
  created_at: '2026-10-22T15:30:00Z',
  input: {
    display_value: 'hxxp://192.0.2.14:8080/secure/login/verify.php',
    normalized_value: 'http://192.0.2.14:8080/secure/login/verify.php',
    input_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    input_length: 46,
  },
  assessment: {
    risk_score: 85,
    risk_level: 'critical',
    confidence: 'high',
    verdict_label: RISK_LEVEL_LABELS.critical,
    limitations: [
      MANDATORY_DISCLAIMERS.offlineLexicalNotice,
    ],
  },
  indicators: [
    {
      indicator_id: 'URL_IP_HOST',
      category: 'domain',
      evidence_kind: 'observed',
      title: 'IP Address Used as Hostname',
      description: 'The destination URL specifies a raw IP address rather than a registered domain name.',
      observed_value: '192.0.2.14',
      severity: 'high',
      triggered: true,
    },
    {
      indicator_id: 'URL_NON_STANDARD_PORT',
      category: 'url_structure',
      evidence_kind: 'observed',
      title: 'Non-Standard Network Port',
      description: 'The URL specifies a custom port (8080) commonly associated with unmonitored proxy or testing endpoints.',
      observed_value: '8080',
      severity: 'medium',
      triggered: true,
    },
    {
      indicator_id: 'URL_NO_HTTPS',
      category: 'url_structure',
      evidence_kind: 'observed',
      title: 'Insecure Plaintext HTTP Scheme',
      description: 'The URL transmits data in unencrypted plaintext.',
      observed_value: 'http',
      severity: 'low',
      triggered: true,
    },
    {
      indicator_id: 'URL_CREDENTIAL_PATH_KEYWORD',
      category: 'credential_lure',
      evidence_kind: 'inferred',
      title: 'Credential Keywords in Path',
      description: 'Path segments contain explicit references to login and account verification.',
      observed_value: '/secure/login/verify.php',
      severity: 'high',
      triggered: true,
    },
  ],
  score_breakdown: [
    {
      indicator_id: 'URL_IP_HOST',
      points: 35,
      reason: 'Direct IP address host used to bypass domain reputation',
      evidence_kind: 'observed',
      capped: false,
    },
    {
      indicator_id: 'URL_NON_STANDARD_PORT',
      points: 15,
      reason: 'Custom port 8080 observed',
      evidence_kind: 'observed',
      capped: false,
    },
    {
      indicator_id: 'URL_NO_HTTPS',
      points: 10,
      reason: 'Unencrypted HTTP protocol',
      evidence_kind: 'observed',
      capped: false,
    },
    {
      indicator_id: 'URL_CREDENTIAL_PATH_KEYWORD',
      points: 25,
      reason: 'Path targets authentication credentials',
      evidence_kind: 'inferred',
      capped: false,
    },
  ],
  external_evidence: [],
  ai_explanation: {
    summary:
      'This link directs to an unencrypted raw numerical IP address on port 8080 with a login verification path. This pattern strongly suggests a credential phishing portal designed to evade domain reputation filters.',
    key_findings: [
      {
        text: 'The link connects directly to an IP address (192.0.2.14) instead of a recognized organization domain.',
        indicator_ids: ['URL_IP_HOST'],
      },
      {
        text: 'The path specifically requests login verification details over an unencrypted channel.',
        indicator_ids: ['URL_CREDENTIAL_PATH_KEYWORD', 'URL_NO_HTTPS'],
      },
    ],
    user_guidance:
      'Do not enter passwords or personal data on this link. Close the page immediately and alert your security team.',
    uncertainty_notes:
      'Lexical analysis was performed without outbound network requests to verify live web server status.',
    generated_by: 'llm',
    model: 'claude-3-5-sonnet-20241022',
    validated: true,
  },
  recommended_actions: [
    {
      action_id: 'ACT_DO_NOT_CLICK',
      priority: 1,
      text: 'Do not click or submit information to this address.',
      applies_to_levels: ['high', 'critical'],
    },
    {
      action_id: 'ACT_RESET_CREDENTIALS',
      priority: 2,
      text: 'If you already entered passwords, immediately reset credentials on the official portal.',
      applies_to_levels: ['critical'],
    },
  ],
  engine_version: '1.0.0',
  processing: {
    duration_ms: 1420,
    ai_status: 'used',
    external_lookup_status: 'not_attempted',
  },
}

export const highReportFixture: ThreatReport = {
  report_id: '8a12bc34-6e23-5d9f-b0c2-4f5a7b8c9d0e',
  schema_version: '1.0',
  scan_type: 'message',
  created_at: '2026-10-22T14:15:00Z',
  input: {
    display_value:
      'URGENT: Your bank account has been suspended due to suspicious activity. Verify immediately at hxxps://secure-verify.example[.]test/login to restore access within 24 hours.',
    normalized_value:
      'URGENT: Your bank account has been suspended due to suspicious activity. Verify immediately at https://secure-verify.example.test/login to restore access within 24 hours.',
    input_hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    input_length: 168,
  },
  assessment: {
    risk_score: 65,
    risk_level: 'high',
    confidence: 'high',
    verdict_label: RISK_LEVEL_LABELS.high,
    limitations: [
      MANDATORY_DISCLAIMERS.offlineLexicalNotice,
    ],
  },
  indicators: [
    {
      indicator_id: 'MSG_URGENCY_DEADLINE',
      category: 'urgency',
      evidence_kind: 'inferred',
      title: 'Artificial Urgency or Strict Deadline',
      description: 'The message imposes a tight deadline (24 hours) designed to prompt hurried action.',
      observed_value: 'within 24 hours',
      severity: 'high',
      triggered: true,
    },
    {
      indicator_id: 'MSG_ACCOUNT_SUSPENSION_LURE',
      category: 'credential_lure',
      evidence_kind: 'inferred',
      title: 'Threat of Account Suspension',
      description: 'Claims account suspension to induce emotional compliance and bypass caution.',
      observed_value: 'account has been suspended',
      severity: 'high',
      triggered: true,
    },
    {
      indicator_id: 'MSG_EMBEDDED_LINK',
      category: 'url_structure',
      evidence_kind: 'observed',
      title: 'Embedded Authentication Link',
      description: 'Directs the recipient to enter credentials on an external portal.',
      observed_value: 'hxxps://secure-verify.example[.]test/login',
      severity: 'medium',
      triggered: true,
    },
  ],
  score_breakdown: [
    {
      indicator_id: 'MSG_URGENCY_DEADLINE',
      points: 25,
      reason: 'Urgent deadline pressure identified',
      evidence_kind: 'inferred',
      capped: false,
    },
    {
      indicator_id: 'MSG_ACCOUNT_SUSPENSION_LURE',
      points: 25,
      reason: 'Coercive suspension lure',
      evidence_kind: 'inferred',
      capped: false,
    },
    {
      indicator_id: 'MSG_EMBEDDED_LINK',
      points: 15,
      reason: 'Unverified external login destination',
      evidence_kind: 'observed',
      capped: false,
    },
  ],
  external_evidence: [],
  ai_explanation: {
    summary:
      'This message exhibits classic bank impersonation tactics with artificial deadline pressure ("within 24 hours") and threats of account suspension to force immediate credential entry on an untrusted domain.',
    key_findings: [
      {
        text: 'The communication induces panic by claiming your financial account is suspended.',
        indicator_ids: ['MSG_ACCOUNT_SUSPENSION_LURE'],
      },
      {
        text: 'Imposes a strict 24-hour deadline to prevent independent verification.',
        indicator_ids: ['MSG_URGENCY_DEADLINE'],
      },
    ],
    user_guidance:
      'Never follow authentication links sent via SMS or unsolicited email. Log in directly via your bank’s official application.',
    uncertainty_notes:
      'Sender phone number or transmission metadata was not analyzed in this text-only scan.',
    generated_by: 'llm',
    model: 'claude-3-5-sonnet-20241022',
    validated: true,
  },
  recommended_actions: [
    {
      action_id: 'ACT_DO_NOT_CLICK',
      priority: 1,
      text: 'Do not follow links or call phone numbers contained in this message.',
      applies_to_levels: ['high', 'critical'],
    },
    {
      action_id: 'ACT_VERIFY_OFFICIAL_CHANNEL',
      priority: 2,
      text: 'Check your account status directly via the organization’s known official app or website.',
      applies_to_levels: ['medium', 'high', 'critical'],
    },
  ],
  engine_version: '1.0.0',
  processing: {
    duration_ms: 1205,
    ai_status: 'used',
    external_lookup_status: 'not_attempted',
  },
}

export const mediumReportFixture: ThreatReport = {
  report_id: '9b23cd45-7f34-6ea0-c1d3-5a6b8c9d0e1f',
  schema_version: '1.0',
  scan_type: 'url',
  created_at: '2026-10-22T13:00:00Z',
  input: {
    display_value: 'hxxps://subdomain.login.portal.example[.]com/auth/verify',
    normalized_value: 'https://subdomain.login.portal.example.com/auth/verify',
    input_hash: 'b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01',
    input_length: 56,
  },
  assessment: {
    risk_score: 35,
    risk_level: 'medium',
    confidence: 'medium',
    verdict_label: RISK_LEVEL_LABELS.medium,
    limitations: [
      MANDATORY_DISCLAIMERS.offlineLexicalNotice,
    ],
  },
  indicators: [
    {
      indicator_id: 'URL_EXCESSIVE_SUBDOMAINS',
      category: 'domain',
      evidence_kind: 'observed',
      title: 'Excessive Subdomain Levels',
      description: 'Host contains 4 subdomain levels, often used to camouflage true destinations.',
      observed_value: 'subdomain.login.portal',
      severity: 'medium',
      triggered: true,
    },
    {
      indicator_id: 'URL_BRAND_IN_SUBDOMAIN',
      category: 'domain',
      evidence_kind: 'inferred',
      title: 'Authentication Keywords in Subdomain',
      description: 'Subdomain segments reference "login" and "portal".',
      observed_value: 'login.portal',
      severity: 'low',
      triggered: true,
    },
  ],
  score_breakdown: [
    {
      indicator_id: 'URL_EXCESSIVE_SUBDOMAINS',
      points: 20,
      reason: 'Deep subdomain hierarchy',
      evidence_kind: 'observed',
      capped: false,
    },
    {
      indicator_id: 'URL_BRAND_IN_SUBDOMAIN',
      points: 15,
      reason: 'Login keywords in hostname prefix',
      evidence_kind: 'inferred',
      capped: false,
    },
  ],
  external_evidence: [],
  ai_explanation: {
    summary:
      'This URL employs multiple subdomain labels containing login terminology. While hosted on a registered domain, excessive prefixes are frequently configured by phishing kits to mimic enterprise single sign-on portals.',
    key_findings: [
      {
        text: 'The hostname includes deep subdomain chaining with authentication keywords.',
        indicator_ids: ['URL_EXCESSIVE_SUBDOMAINS', 'URL_BRAND_IN_SUBDOMAIN'],
      },
    ],
    user_guidance:
      'Verify that the parent domain belongs to the service you intend to access before entering credentials.',
    uncertainty_notes:
      'Subdomains may represent legitimate multi-tenant enterprise routing.',
    generated_by: 'llm',
    model: 'claude-3-5-sonnet-20241022',
    validated: true,
  },
  recommended_actions: [
    {
      action_id: 'ACT_CHECK_PARENT_DOMAIN',
      priority: 1,
      text: 'Confirm that the root domain matches your organization’s authorized identity provider.',
      applies_to_levels: ['medium', 'high'],
    },
  ],
  engine_version: '1.0.0',
  processing: {
    duration_ms: 980,
    ai_status: 'used',
    external_lookup_status: 'not_attempted',
  },
}

export const lowReportFixture: ThreatReport = {
  report_id: '1c34de56-8a45-7fb1-d2e4-6b7c9d0e1f2a',
  schema_version: '1.0',
  scan_type: 'url',
  created_at: '2026-10-22T12:00:00Z',
  input: {
    display_value: 'hxxps://docs.example[.]com/guides/getting-started',
    normalized_value: 'https://docs.example.com/guides/getting-started',
    input_hash: 'c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef012',
    input_length: 50,
  },
  assessment: {
    risk_score: 10,
    risk_level: 'low',
    confidence: 'high',
    verdict_label: RISK_LEVEL_LABELS.low,
    limitations: [
      MANDATORY_DISCLAIMERS.lowRiskLimitation,
      MANDATORY_DISCLAIMERS.offlineLexicalNotice,
    ],
  },
  indicators: [
    {
      indicator_id: 'URL_INFO_STANDARD_HTTPS',
      category: 'url_structure',
      evidence_kind: 'observed',
      title: 'Standard HTTPS Protocol',
      description: 'Destination uses standard encrypted HTTPS on port 443 with conventional path structure.',
      observed_value: 'https',
      severity: 'info',
      triggered: true,
    },
  ],
  score_breakdown: [
    {
      indicator_id: 'URL_INFO_STANDARD_HTTPS',
      points: 10,
      reason: 'Baseline informational indicator',
      evidence_kind: 'observed',
      capped: false,
    },
  ],
  external_evidence: [],
  ai_explanation: {
    summary:
      'Lexical analysis found no common phishing or deception markers. Standard HTTPS is utilized with simple documentation paths on a recognized domain.',
    key_findings: [
      {
        text: 'Conventional documentation path without credential lures or obfuscated parameters.',
        indicator_ids: ['URL_INFO_STANDARD_HTTPS'],
      },
    ],
    user_guidance:
      'No elevated indicators detected. Exercise ordinary caution when navigating external sites.',
    uncertainty_notes:
      'Lexical heuristics cannot inspect page code or guarantee destination safety.',
    generated_by: 'llm',
    model: 'claude-3-5-sonnet-20241022',
    validated: true,
  },
  recommended_actions: [
    {
      action_id: 'ACT_STANDARD_CAUTION',
      priority: 1,
      text: 'Proceed with normal awareness. Verify destination address if prompted for sign-in.',
      applies_to_levels: ['low'],
    },
  ],
  engine_version: '1.0.0',
  processing: {
    duration_ms: 850,
    ai_status: 'used',
    external_lookup_status: 'not_attempted',
  },
}

export const inconclusiveReportFixture: ThreatReport = {
  report_id: '2d45ef67-9b56-8ac2-e3f5-7c8d0e1f2a3b',
  schema_version: '1.0',
  scan_type: 'url',
  created_at: '2026-10-22T11:00:00Z',
  input: {
    display_value: 'hxxp://[invalid',
    normalized_value: null,
    input_hash: 'd4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0123',
    input_length: 15,
  },
  assessment: {
    risk_score: 0,
    risk_level: 'inconclusive',
    confidence: 'low',
    verdict_label: RISK_LEVEL_LABELS.inconclusive,
    limitations: [
      MANDATORY_DISCLAIMERS.inconclusiveNotice,
    ],
  },
  indicators: [],
  score_breakdown: [],
  external_evidence: [],
  ai_explanation: {
    summary:
      'The submitted input was unparsable or malformed, preventing lexical and structural security analysis.',
    key_findings: [],
    user_guidance:
      'Verify the destination link manually. Do not assume content is safe because analysis could not complete.',
    uncertainty_notes:
      'Analysis engine aborted evaluation due to malformed input.',
    generated_by: 'deterministic_fallback',
    model: null,
    validated: true,
  },
  recommended_actions: [
    {
      action_id: 'ACT_RETRY_VALID_URL',
      priority: 1,
      text: 'Check the URL format and resubmit the complete address for analysis.',
      applies_to_levels: ['inconclusive'],
    },
  ],
  engine_version: '1.0.0',
  processing: {
    duration_ms: 120,
    ai_status: 'disabled',
    external_lookup_status: 'not_attempted',
  },
}

export const fallbackAiReportFixture: ThreatReport = {
  report_id: '3e56fa78-0c67-9bd3-f4a6-8d9e1f2a3b4c',
  schema_version: '1.0',
  scan_type: 'message',
  created_at: '2026-10-22T10:30:00Z',
  input: {
    display_value:
      'Package delivery pending. Please update your address at hxxps://track.parcel-service.example[.]test to avoid return to sender.',
    normalized_value:
      'Package delivery pending. Please update your address at https://track.parcel-service.example.test to avoid return to sender.',
    input_hash: 'e5f67890123456789abcdef0123456789abcdef0123456789abcdef01234',
    input_length: 127,
  },
  assessment: {
    risk_score: 55,
    risk_level: 'high',
    confidence: 'medium',
    verdict_label: RISK_LEVEL_LABELS.high,
    limitations: [
      MANDATORY_DISCLAIMERS.offlineLexicalNotice,
    ],
  },
  indicators: [
    {
      indicator_id: 'MSG_PACKAGE_LURE',
      category: 'urgency',
      evidence_kind: 'inferred',
      title: 'Package Delivery Smishing Lure',
      description: 'Claims an undelivered parcel to prompt immediate link engagement.',
      observed_value: 'Package delivery pending',
      severity: 'high',
      triggered: true,
    },
    {
      indicator_id: 'URL_LOOKALIKE_SERVICE',
      category: 'domain',
      evidence_kind: 'inferred',
      title: 'Hyphenated Brand or Delivery Keyword',
      description: 'Domain incorporates parcel-service keywords commonly utilized in smishing campaigns.',
      observed_value: 'parcel-service',
      severity: 'medium',
      triggered: true,
    },
  ],
  score_breakdown: [
    {
      indicator_id: 'MSG_PACKAGE_LURE',
      points: 30,
      reason: 'Delivery smishing pattern detected',
      evidence_kind: 'inferred',
      capped: false,
    },
    {
      indicator_id: 'URL_LOOKALIKE_SERVICE',
      points: 25,
      reason: 'Delivery keyword combination',
      evidence_kind: 'inferred',
      capped: false,
    },
  ],
  external_evidence: [],
  ai_explanation: {
    summary:
      'Deterministic rule assessment: This message matches recognized package delivery smishing templates that use fictitious delivery notices to solicit personal data and payment fees on unverified domains.',
    key_findings: [
      {
        text: 'Employs an undelivered package scenario to encourage rapid action.',
        indicator_ids: ['MSG_PACKAGE_LURE'],
      },
      {
        text: 'Directs recipients to an unverified tracking portal with suspicious keywords.',
        indicator_ids: ['URL_LOOKALIKE_SERVICE'],
      },
    ],
    user_guidance:
      'Do not enter card numbers or personal details on the provided link. Contact the parcel carrier directly via their official portal.',
    uncertainty_notes:
      'Evaluated via deterministic fallback heuristics because AI model synthesis was unavailable.',
    generated_by: 'deterministic_fallback',
    model: null,
    validated: true,
  },
  recommended_actions: [
    {
      action_id: 'ACT_DO_NOT_CLICK',
      priority: 1,
      text: 'Do not submit tracking or personal details to this address.',
      applies_to_levels: ['high'],
    },
  ],
  engine_version: '1.0.0',
  processing: {
    duration_ms: 340,
    ai_status: 'fallback_used',
    external_lookup_status: 'not_attempted',
  },
}

export const adversarialReportFixture: ThreatReport = {
  report_id: '4f67ab89-1d78-0ce4-a5b7-9e0f2a3b4c5d',
  schema_version: '1.0',
  scan_type: 'url',
  created_at: '2026-10-22T09:00:00Z',
  input: {
    display_value:
      'hxxps://раураӏ[.]example[.]com/very/long/unbroken/path/designed/to/test/layout/wrapping/and/responsive/boundary/safety/without/horizontal/overflow/while/containing/adversarial/parameters?token=abcdef1234567890abcdef1234567890&redirect=hxxps%3A%2F%2Fmalicious-site.invalid%2Fpayload%3Ftarget%3Dvictim',
    normalized_value:
      'https://раураӏ.example.com/very/long/unbroken/path/designed/to/test/layout/wrapping/and/responsive/boundary/safety/without/horizontal/overflow/while/containing/adversarial/parameters?token=abcdef1234567890abcdef1234567890&redirect=https%3A%2F%2Fmalicious-site.invalid%2Fpayload%3Ftarget%3Dvictim',
    input_hash: 'f67890123456789abcdef0123456789abcdef0123456789abcdef012345',
    input_length: 312,
  },
  assessment: {
    risk_score: 80,
    risk_level: 'critical',
    confidence: 'high',
    verdict_label: RISK_LEVEL_LABELS.critical,
    limitations: [
      MANDATORY_DISCLAIMERS.offlineLexicalNotice,
    ],
  },
  indicators: [
    {
      indicator_id: 'URL_HOMOGLYPH_CYRILLIC',
      category: 'homoglyph',
      evidence_kind: 'observed',
      title: 'Cyrillic Homoglyph Characters in Hostname',
      description: 'Hostname contains Cyrillic characters visually indistinguishable from Latin glyphs (IDN spoofing).',
      observed_value: 'раураӏ',
      severity: 'critical',
      triggered: true,
    },
    {
      indicator_id: 'URL_EXCESSIVE_LENGTH',
      category: 'url_structure',
      evidence_kind: 'observed',
      title: 'Excessive URL Length',
      description: 'The URL exceeds 300 characters with deeply nested tracking parameters.',
      observed_value: '312 characters',
      severity: 'medium',
      triggered: true,
    },
    {
      indicator_id: 'URL_OPEN_REDIRECT_PARAM',
      category: 'redirect_shortener',
      evidence_kind: 'observed',
      title: 'Open Redirect Parameter',
      description: 'Query string carries a secondary URL in parameter "redirect".',
      observed_value: 'redirect=https%3A%2F%2Fmalicious-site.invalid',
      severity: 'high',
      triggered: true,
    },
  ],
  score_breakdown: [
    {
      indicator_id: 'URL_HOMOGLYPH_CYRILLIC',
      points: 40,
      reason: 'IDN homoglyph spoofing in brand hostname',
      evidence_kind: 'observed',
      capped: false,
    },
    {
      indicator_id: 'URL_OPEN_REDIRECT_PARAM',
      points: 25,
      reason: 'Secondary redirect parameter detected',
      evidence_kind: 'observed',
      capped: false,
    },
    {
      indicator_id: 'URL_EXCESSIVE_LENGTH',
      points: 15,
      reason: 'URL length exceeds benign baseline',
      evidence_kind: 'observed',
      capped: false,
    },
  ],
  external_evidence: [],
  ai_explanation: {
    summary:
      'This target demonstrates severe deceptive engineering: Cyrillic homoglyphs are used in the hostname to masquerade as a well-known brand, combined with open redirect parameters designed to bypass basic lexical filters.',
    key_findings: [
      {
        text: 'Cyrillic characters replace Latin letters in the domain name.',
        indicator_ids: ['URL_HOMOGLYPH_CYRILLIC'],
      },
      {
        text: 'Contains embedded redirect parameters pointing to an external destination.',
        indicator_ids: ['URL_OPEN_REDIRECT_PARAM'],
      },
    ],
    user_guidance:
      'Do not interact with this link. The domain utilizes character spoofing to deceptively mimic legitimate infrastructure.',
    uncertainty_notes:
      'Offline heuristic evaluation confirmed character set mixing without DNS resolution.',
    generated_by: 'llm',
    model: 'claude-3-5-sonnet-20241022',
    validated: true,
  },
  recommended_actions: [
    {
      action_id: 'ACT_BLOCK_DOMAIN',
      priority: 1,
      text: 'Add the Punycode hostname to your perimeter blocklist.',
      applies_to_levels: ['critical'],
    },
  ],
  engine_version: '1.0.0',
  processing: {
    duration_ms: 1540,
    ai_status: 'used',
    external_lookup_status: 'not_attempted',
  },
}

export const ALL_MOCK_FIXTURES: ThreatReport[] = [
  criticalReportFixture,
  highReportFixture,
  mediumReportFixture,
  lowReportFixture,
  inconclusiveReportFixture,
  fallbackAiReportFixture,
  adversarialReportFixture,
]
