/**
 * Central CIPHER AI Wording & Lexical Constant Dictionary
 * Governed by docs/requirements/glossary-and-wording.md
 * Absolute invariant: Never guarantee or claim that content is safe.
 */

import type { RiskLevel } from '@/types/threat-report'
import type { ErrorCode } from '@/types/api'

export const APP_NAME = 'CIPHER AI'
export const APP_TAGLINE = 'Understand threats. Protect what matters.'
export const APP_SUBTITLE =
  'Fast, offline-first lexical analysis of suspicious URLs and scam messages with transparent, verifiable evidence.'

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'Low risk indicators found',
  medium: 'Suspicious patterns detected',
  high: 'High risk indicators identified',
  critical: 'Critical threat indicators identified',
  inconclusive: 'Inconclusive, not enough information',
}

export const VERDICT_DESCRIPTIONS: Record<RiskLevel, string> = {
  low: 'Few or no common threat markers were identified in lexical inspection. Routine caution is still advised.',
  medium: 'Multiple indicators suggest deceptive structure or atypical parameters that warrant investigation.',
  high: 'Elevated threat signals identified, including credential harvesting patterns or obfuscated destinations.',
  critical: 'Direct malicious indicators detected such as raw IP hostname, credential lures, or known fraud signatures.',
  inconclusive: 'CIPHER AI could not perform a conclusive evaluation because the input was unparsable, insufficient in length, or unsupported. This result does not imply that the content is benign.',
}

export const MANDATORY_DISCLAIMERS = {
  lowRiskLimitation:
    'No strong indicators were found by CIPHER AI. This does not guarantee that the content is safe.',
  offlineLexicalNotice:
    'Offline lexical analysis only; destination web page content was not fetched or executed.',
  externalEvidenceNotFlagged:
    'A status of not_flagged indicates this asset is not currently listed in external databases; it does not constitute proof of safety.',
  inconclusiveNotice:
    'CIPHER AI could not perform a conclusive evaluation because the input was unparsable, insufficient in length, or unsupported. This result does not imply that the content is benign.',
}

export const AI_LABELS = {
  llmBadge: 'AI Threat Summary',
  llmSubtitle: 'Generated based on structured indicators. Always verify critical findings.',
  fallbackBadge: 'Deterministic Threat Summary',
  fallbackSubtitle:
    'Generated using deterministic rule heuristics without generative AI synthesis.',
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'The submitted input did not pass format validation. Please check your entry and try again.',
  INVALID_URL: 'The provided string does not conform to valid URL syntax. Please enter a valid http or https link.',
  INPUT_TOO_LARGE: 'Input exceeds the maximum allowed character limit (2,048 chars for URLs, 5,000 for messages).',
  UNAUTHENTICATED: 'Your current session could not be authenticated. A new anonymous session has been initiated.',
  FORBIDDEN: 'You do not have permission to view or modify this scan.',
  NOT_FOUND: 'The requested threat report could not be found or has been deleted.',
  RATE_LIMITED: 'Rate limit reached. Please wait a moment before running another scan.',
  DEPENDENCY_UNAVAILABLE: 'The CIPHER AI scanning engine is temporarily unreachable. Your input has been preserved.',
  INTERNAL_ERROR: 'An unexpected processing error occurred while analyzing the target. Please try again.',
}

export const EMPTY_STATES = {
  history: {
    title: 'No recent scans found',
    description: 'Analyze a suspicious link or scam message above to see your threat reports here.',
    cta: 'Start a new scan',
  },
  indicators: {
    title: 'No indicators triggered',
    description: 'No known security risk rules or heuristics matched this input.',
  },
  externalEvidence: {
    title: 'External intelligence not available',
    description: 'Third-party threat feeds and reputation lookups are not enabled in this offline version.',
  },
  cases: {
    title: 'Case Dossiers Coming in Phase 08',
    description: 'Multi-scan case management, investigator notes, and export features will arrive in Phase 08.',
  },
}

export const TRUST_CARDS = [
  {
    title: 'Evidence First',
    description: 'Every risk score is backed by deterministic facts and verifiable lexical clues, not black-box guesses.',
  },
  {
    title: 'Plain-Language AI',
    description: 'Generative summaries translate complex URL structures into calm, actionable defense advice.',
  },
  {
    title: 'Never Claims 100 Percent Safety',
    description: 'We respect zero-day realities. A low score means low indicators found, never an absolute guarantee.',
  },
]
