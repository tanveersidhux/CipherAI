/**
 * Native Fetch Client with Timeouts, AbortController, and Error Normalization.
 * Implements FR-6.5 and technical requirements for Phase 06.
 */

import { getApiBaseUrl } from '@/lib/config'
import { ApiError, normalizeApiError } from './errors'

export { CipherApiProvider, useCipherApi, CipherApiContext } from './provider'
export type { CipherApiProviderProps } from './provider'
export * from '@/types/api'
export * from './guards'
export * from './scan'
export * from './explanations'

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number
  guard?: (data: unknown) => boolean
}

export interface ApiFetchResult<T> {
  data: T
  response: Response
  requestId?: string
}

export const DEFAULT_TIMEOUT_SCANS_MS = 20000
export const DEFAULT_TIMEOUT_EXPLANATIONS_MS = 20000
export const DEFAULT_TIMEOUT_HEALTH_MS = 5000

/**
 * Robust JSON fetch wrapper connecting the frontend to the FastAPI backend.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<ApiFetchResult<T>> {
  const baseUrl = getApiBaseUrl()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const targetUrl = `${baseUrl.replace(/\/+$/, '')}${cleanPath}`

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_SCANS_MS
  const timeoutController = new AbortController()

  // Handle external abort signal chained with timeout signal
  const callerSignal = options.signal
  const activeSignal = callerSignal
    ? anySignal([callerSignal, timeoutController.signal])
    : timeoutController.signal

  const timeoutTimer = setTimeout(() => {
    timeoutController.abort(new DOMException('Request timed out', 'AbortError'))
  }, timeoutMs)

  try {
    const headers = new Headers(options.headers || {})
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json')
    }
    if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(targetUrl, {
      ...options,
      headers,
      signal: activeSignal,
    })

    const reqId = response.headers.get('X-Request-ID') || undefined
    const retryAfterHeader = response.headers.get('Retry-After')
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined

    if (!response.ok) {
      let errorBody: unknown = null
      try {
        errorBody = await response.json()
      } catch {
        // Response was not JSON (e.g. 502/504 HTML error page)
      }

      throw normalizeApiError(
        errorBody || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        reqId,
        Number.isFinite(retryAfter) ? retryAfter : undefined
      )
    }

    // Parse JSON
    let parsedJson: unknown
    try {
      parsedJson = await response.json()
    } catch {
      throw new ApiError(
        'INVALID_RESPONSE',
        'Server returned unparseable non-JSON data.',
        [],
        reqId || 'req_json_parse_fail',
        response.status
      )
    }

    // Structural runtime guard validation
    if (options.guard && !options.guard(parsedJson)) {
      throw new ApiError(
        'INVALID_RESPONSE',
        'Backend response did not conform to the required security contract schema.',
        [],
        reqId || 'req_guard_fail',
        response.status
      )
    }

    return {
      data: parsedJson as T,
      response,
      requestId: reqId,
    }
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err
    }
    throw normalizeApiError(err)
  } finally {
    clearTimeout(timeoutTimer)
  }
}

/**
 * Polyfill-safe combine of multiple AbortSignals.
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      return controller.signal
    }
    signal.addEventListener(
      'abort',
      () => {
        controller.abort(signal.reason)
      },
      { once: true }
    )
  }
  return controller.signal
}
