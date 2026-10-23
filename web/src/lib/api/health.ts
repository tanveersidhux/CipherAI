/**
 * Typed health check client with timeout and structural validation.
 *
 * Connects to GET /api/v1/health using native fetch with an AbortController.
 * Does not replace MockCipherApi for scan and report operations.
 */

import { getApiBaseUrl } from '@/lib/config'

export interface DependencyHealth {
  database: 'ok' | 'unavailable' | 'not_configured'
  llm: 'enabled' | 'disabled' | 'not_configured'
}

export interface HealthData {
  status: 'ok'
  app_version: string
  environment: 'development' | 'test' | 'production'
  timestamp: string
  dependencies: DependencyHealth
}

export type HealthFailureReason = 'network' | 'timeout' | 'invalid_response' | 'http_error'

export type HealthResult =
  | { ok: true; data: HealthData; request_id?: string }
  | { ok: false; reason: HealthFailureReason; status_code?: number; request_id?: string }

const TIMEOUT_MS = 8000

/**
 * Structural validation runtime guard for HealthData payload.
 */
export function isHealthData(obj: unknown): obj is HealthData {
  if (!obj || typeof obj !== 'object') return false
  const r = obj as Record<string, unknown>

  if (r.status !== 'ok') return false
  if (typeof r.app_version !== 'string' || !r.app_version) return false
  if (r.environment !== 'development' && r.environment !== 'test' && r.environment !== 'production') return false
  if (typeof r.timestamp !== 'string' || !r.timestamp) return false

  if (!r.dependencies || typeof r.dependencies !== 'object') return false
  const deps = r.dependencies as Record<string, unknown>

  const validDb = ['ok', 'unavailable', 'not_configured'].includes(String(deps.database))
  const validLlm = ['enabled', 'disabled', 'not_configured'].includes(String(deps.llm))

  return validDb && validLlm
}

/**
 * Query backend health status.
 */
export async function getHealth(customBaseUrl?: string): Promise<HealthResult> {
  const baseUrl = customBaseUrl ?? getApiBaseUrl()
  const targetUrl = `${baseUrl.replace(/\/+$/, '')}/api/v1/health`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    const reqId = response.headers.get('X-Request-ID') || undefined

    if (!response.ok) {
      return {
        ok: false,
        reason: 'http_error',
        status_code: response.status,
        request_id: reqId,
      }
    }

    let json: unknown
    try {
      json = await response.json()
    } catch {
      return {
        ok: false,
        reason: 'invalid_response',
        request_id: reqId,
      }
    }

    if (!isHealthData(json)) {
      return {
        ok: false,
        reason: 'invalid_response',
        request_id: reqId,
      }
    }

    return {
      ok: true,
      data: json,
      request_id: reqId,
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, reason: 'timeout' }
    }
    return { ok: false, reason: 'network' }
  } finally {
    clearTimeout(timer)
  }
}
