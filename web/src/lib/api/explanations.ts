/**
 * Explanation and AI status API methods connecting to /api/v1/explanations and /api/v1/ai/status.
 */

import { apiFetch, DEFAULT_TIMEOUT_EXPLANATIONS_MS, DEFAULT_TIMEOUT_HEALTH_MS } from './client'
import { isExplanationResponse } from './guards'
import type { ThreatReport } from '@/types/threat-report'
import type {
  ExplanationResponse,
  AudienceLevel,
  AIStatusResponse,
} from '@/types/explanation'

/**
 * Request an evidence-grounded AI (or fallback) explanation for a ThreatReport.
 */
export async function requestExplanation(
  report: ThreatReport,
  audienceLevel: AudienceLevel = 'simple',
  signal?: AbortSignal
): Promise<ExplanationResponse> {
  const result = await apiFetch<ExplanationResponse>('/api/v1/explanations', {
    method: 'POST',
    body: JSON.stringify({
      report,
      audience_level: audienceLevel,
    }),
    signal,
    timeoutMs: DEFAULT_TIMEOUT_EXPLANATIONS_MS,
    guard: isExplanationResponse,
  })
  return result.data
}

/**
 * Check backend AI availability and configured provider/model without secrets.
 */
export async function getAiStatus(signal?: AbortSignal): Promise<AIStatusResponse> {
  const result = await apiFetch<AIStatusResponse>('/api/v1/ai/status', {
    method: 'GET',
    signal,
    timeoutMs: DEFAULT_TIMEOUT_HEALTH_MS,
    guard: (obj: unknown): obj is AIStatusResponse => {
      if (!obj || typeof obj !== 'object') return false
      const s = obj as Partial<AIStatusResponse>
      return (
        typeof s.ai_enabled === 'boolean' &&
        typeof s.provider_configured === 'boolean'
      )
    },
  })
  return result.data
}
