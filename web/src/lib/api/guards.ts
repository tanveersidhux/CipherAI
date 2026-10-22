/**
 * CIPHER AI Runtime Schema Type Guards.
 * Defensive boundary checks to ensure backend payloads strictly conform to typed contracts
 * before passing into state or rendering.
 */

import type { ThreatReport } from '@/types/threat-report'
import type { ExplanationResponse } from '@/types/explanation'

/**
 * Structural validation runtime guard for ThreatReport payload.
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

/**
 * Structural validation runtime guard for Phase 05/06 ExplanationResponse payload.
 */
export function isExplanationResponse(obj: unknown): obj is ExplanationResponse {
  if (!obj || typeof obj !== 'object') return false
  const r = obj as Partial<ExplanationResponse>

  if (!r.explanation || typeof r.explanation !== 'object') return false
  if (!r.meta || typeof r.meta !== 'object') return false

  const exp = r.explanation
  if (
    typeof exp.summary !== 'string' ||
    typeof exp.risk_statement !== 'string' ||
    !Array.isArray(exp.key_findings) ||
    !Array.isArray(exp.recommended_actions) ||
    !['low', 'medium', 'high'].includes(exp.confidence) ||
    !Array.isArray(exp.limitations) ||
    typeof exp.disclaimer !== 'string'
  ) {
    return false
  }

  // Key findings validation
  for (const kf of exp.key_findings) {
    if (
      typeof kf.title !== 'string' ||
      typeof kf.detail !== 'string' ||
      !Array.isArray(kf.evidence_ids)
    ) {
      return false
    }
  }

  // Recommended actions validation
  for (const ra of exp.recommended_actions) {
    if (
      !['high', 'medium', 'low'].includes(ra.priority) ||
      typeof ra.action !== 'string'
    ) {
      return false
    }
  }

  const meta = r.meta
  if (
    !['ai', 'deterministic_fallback'].includes(meta.explanation_source) ||
    typeof meta.prompt_injection_suspected !== 'boolean' ||
    typeof meta.latency_ms !== 'number' ||
    typeof meta.generated_at !== 'string'
  ) {
    return false
  }

  return true
}
