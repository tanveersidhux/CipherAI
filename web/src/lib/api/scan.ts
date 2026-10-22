/**
 * Typed scan API methods calling FastAPI endpoints /api/v1/scans/url and /api/v1/scans/message.
 */

import { apiFetch, DEFAULT_TIMEOUT_SCANS_MS } from './client'
import { isThreatReport } from './guards'
import type { ThreatReport } from '@/types/threat-report'

export interface ScanUrlParams {
  url: string
  options?: {
    use_ai?: boolean
    persist?: boolean
  }
}

export interface ScanMessageParams {
  message: string
  channel?: 'sms' | 'email_body' | 'chat' | 'social' | 'unknown'
  options?: {
    use_ai?: boolean
    persist?: boolean
  }
}

/**
 * Scan a suspicious URL via backend deterministic engine.
 */
export async function scanUrl(
  params: ScanUrlParams,
  signal?: AbortSignal
): Promise<ThreatReport> {
  const result = await apiFetch<ThreatReport>('/api/v1/scans/url', {
    method: 'POST',
    body: JSON.stringify({
      url: params.url,
      options: params.options || { use_ai: true, persist: true },
    }),
    signal,
    timeoutMs: DEFAULT_TIMEOUT_SCANS_MS,
    guard: isThreatReport,
  })
  return result.data
}

/**
 * Scan a suspicious message via backend deterministic engine.
 */
export async function scanMessage(
  params: ScanMessageParams,
  signal?: AbortSignal
): Promise<ThreatReport> {
  const result = await apiFetch<ThreatReport>('/api/v1/scans/message', {
    method: 'POST',
    body: JSON.stringify({
      message: params.message,
      channel: params.channel || 'unknown',
      options: params.options || { use_ai: true, persist: true },
    }),
    signal,
    timeoutMs: DEFAULT_TIMEOUT_SCANS_MS,
    guard: isThreatReport,
  })
  return result.data
}
