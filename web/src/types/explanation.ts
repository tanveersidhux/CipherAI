/**
 * CIPHER AI Phase 05 Explanation API Contract Types
 * Mirrors backend Pydantic models in api/app/ai/schemas.py.
 */

import type { ThreatReport } from './threat-report'

export type FallbackReason =
  | 'AI_DISABLED'
  | 'MISSING_API_KEY'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR'
  | 'RATE_LIMITED'
  | 'INVALID_JSON'
  | 'SCHEMA_VALIDATION_FAILED'
  | 'GROUNDING_VALIDATION_FAILED'
  | 'CIRCUIT_OPEN'
  | 'INPUT_REJECTED'

export type ActionPriority = 'high' | 'medium' | 'low'
export type AIConfidence = 'low' | 'medium' | 'high'
export type ExplanationSource = 'ai' | 'deterministic_fallback'
export type AudienceLevel = 'simple' | 'technical'

export interface KeyFinding {
  title: string
  detail: string
  evidence_ids: string[]
}

export interface RecommendedAction {
  priority: ActionPriority
  action: string
}

export interface AIExplanation {
  summary: string
  risk_statement: string
  key_findings: KeyFinding[]
  recommended_actions: RecommendedAction[]
  confidence: AIConfidence
  limitations: string[]
  disclaimer: string
}

export interface ExplanationMeta {
  explanation_source: ExplanationSource
  model: string | null
  fallback_reason: FallbackReason | null
  prompt_injection_suspected: boolean
  latency_ms: number
  generated_at: string
}

export interface ExplanationResponse {
  explanation: AIExplanation
  meta: ExplanationMeta
}

export interface ExplainRequest {
  report: ThreatReport
  audience_level?: AudienceLevel
}

export interface AIStatusResponse {
  ai_enabled: boolean
  provider_configured: boolean
  model: string | null
}
