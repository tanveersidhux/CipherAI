/**
 * Canonical Threat Intelligence Types
 * Strict field-for-field mapping of docs/api/schemas/*.json (Phase 01)
 * All fields preserved in snake_case.
 */

export type ScanType = 'url' | 'message' | 'email' | 'batch_item'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'inconclusive'

export type ConfidenceLevel = 'low' | 'medium' | 'high'

export type SeverityLevel = 'info' | 'low' | 'medium' | 'high' | 'critical'

export type EvidenceKind = 'observed' | 'inferred' | 'external'

export type IndicatorCategory =
  | 'url_structure'
  | 'domain'
  | 'homoglyph'
  | 'redirect_shortener'
  | 'credential_lure'
  | 'urgency'
  | 'impersonation'
  | 'payment_request'
  | 'contact_channel'
  | 'attachment'
  | 'reputation'
  | 'other'

export interface ThreatReportInput {
  display_value: string
  normalized_value: string | null
  input_hash: string
  input_length: number
}

export interface ThreatReportAssessment {
  risk_score: number
  risk_level: RiskLevel
  confidence: ConfidenceLevel
  verdict_label: string
  limitations: string[]
}

export interface Indicator {
  indicator_id: string
  category: IndicatorCategory
  evidence_kind: EvidenceKind
  title: string
  description: string
  observed_value: string | null
  severity: SeverityLevel
  triggered: boolean
}

export interface ScoreContribution {
  indicator_id: string
  points: number
  reason: string
  evidence_kind: EvidenceKind
  capped: boolean
}

export interface ExternalEvidence {
  source: string
  checked_at: string
  status: 'flagged' | 'not_flagged' | 'unknown' | 'error' | 'rate_limited'
  detail: string | null
  reference_url: string | null
  note: string
}

export interface KeyFinding {
  text: string
  indicator_ids: string[]
}

export interface AIExplanation {
  summary: string
  key_findings: KeyFinding[]
  user_guidance: string
  uncertainty_notes: string
  generated_by: 'llm' | 'deterministic_fallback'
  model: string | null
  validated: boolean
}

export interface RecommendedAction {
  action_id: string
  priority: number
  text: string
  applies_to_levels: RiskLevel[]
}

export interface ProcessingMetadata {
  duration_ms: number
  ai_status: 'used' | 'fallback_used' | 'disabled'
  external_lookup_status: 'not_attempted' | 'complete' | 'partial' | 'unavailable'
}

export interface ThreatReport {
  report_id: string
  schema_version: string
  scan_type: ScanType
  created_at: string
  input: ThreatReportInput
  assessment: ThreatReportAssessment
  indicators: Indicator[]
  score_breakdown: ScoreContribution[]
  external_evidence: ExternalEvidence[]
  ai_explanation: AIExplanation
  recommended_actions: RecommendedAction[]
  engine_version: string
  processing: ProcessingMetadata
}

/**
 * Runtime type guard asserting that an unknown object strictly conforms
 * to the ThreatReport structure and Phase 01 JSON schema constraints.
 */
export function isThreatReport(obj: unknown): obj is ThreatReport {
  if (!obj || typeof obj !== 'object') return false
  const r = obj as Partial<ThreatReport>

  const hasValidPrimitives =
    typeof r.report_id === 'string' &&
    typeof r.schema_version === 'string' &&
    typeof r.engine_version === 'string' &&
    ['url', 'message', 'email', 'batch_item'].includes(r.scan_type ?? '') &&
    typeof r.created_at === 'string'

  if (!hasValidPrimitives) return false

  // Input check
  if (
    !r.input ||
    typeof r.input.display_value !== 'string' ||
    typeof r.input.input_hash !== 'string' ||
    typeof r.input.input_length !== 'number'
  ) {
    return false
  }

  // Assessment check
  if (
    !r.assessment ||
    typeof r.assessment.risk_score !== 'number' ||
    r.assessment.risk_score < 0 ||
    r.assessment.risk_score > 100 ||
    !['low', 'medium', 'high', 'critical', 'inconclusive'].includes(r.assessment.risk_level) ||
    !['low', 'medium', 'high'].includes(r.assessment.confidence) ||
    typeof r.assessment.verdict_label !== 'string' ||
    !Array.isArray(r.assessment.limitations)
  ) {
    return false
  }

  // Indicators check
  if (!Array.isArray(r.indicators)) return false
  for (const ind of r.indicators) {
    if (
      typeof ind.indicator_id !== 'string' ||
      typeof ind.title !== 'string' ||
      typeof ind.description !== 'string' ||
      typeof ind.triggered !== 'boolean' ||
      !['observed', 'inferred', 'external'].includes(ind.evidence_kind) ||
      !['info', 'low', 'medium', 'high', 'critical'].includes(ind.severity)
    ) {
      return false
    }
  }

  // Score breakdown check
  if (!Array.isArray(r.score_breakdown)) return false
  for (const sc of r.score_breakdown) {
    if (
      typeof sc.indicator_id !== 'string' ||
      typeof sc.points !== 'number' ||
      typeof sc.reason !== 'string' ||
      typeof sc.capped !== 'boolean' ||
      !['observed', 'inferred', 'external'].includes(sc.evidence_kind)
    ) {
      return false
    }
  }

  // External evidence check
  if (!Array.isArray(r.external_evidence)) return false

  // AI explanation check
  if (
    !r.ai_explanation ||
    typeof r.ai_explanation.summary !== 'string' ||
    !Array.isArray(r.ai_explanation.key_findings) ||
    typeof r.ai_explanation.user_guidance !== 'string' ||
    typeof r.ai_explanation.uncertainty_notes !== 'string' ||
    !['llm', 'deterministic_fallback'].includes(r.ai_explanation.generated_by) ||
    typeof r.ai_explanation.validated !== 'boolean'
  ) {
    return false
  }

  // Recommended actions check
  if (!Array.isArray(r.recommended_actions)) return false
  for (const act of r.recommended_actions) {
    if (
      typeof act.action_id !== 'string' ||
      typeof act.priority !== 'number' ||
      typeof act.text !== 'string' ||
      !Array.isArray(act.applies_to_levels)
    ) {
      return false
    }
  }

  // Processing check
  if (
    !r.processing ||
    typeof r.processing.duration_ms !== 'number' ||
    !['used', 'fallback_used', 'disabled'].includes(r.processing.ai_status) ||
    !['not_attempted', 'complete', 'partial', 'unavailable'].includes(
      r.processing.external_lookup_status
    )
  ) {
    return false
  }

  return true
}
