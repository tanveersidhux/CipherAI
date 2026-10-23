/**
 * CIPHER AI Standard API Error Abstractions and Normalization Helpers.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_URL'
  | 'INPUT_TOO_LARGE'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'RATE_LIMITED'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'

export interface ErrorDetail {
  field: string | null
  issue: string
}

export interface ErrorEnvelope {
  error: {
    code: string
    message: string
    details: ErrorDetail[]
    request_id: string
  }
}

/**
 * Standardized ApiError thrown on non-2xx responses or network failures.
 */
export class ApiError extends Error {
  readonly code: ErrorCode
  readonly details: ErrorDetail[]
  readonly request_id: string
  readonly http_status: number
  readonly retryAfterSeconds?: number

  // Friendly aliases matching both Phase 02 and Phase 06 prompt contracts
  get status(): number {
    return this.http_status
  }

  get requestId(): string {
    return this.request_id
  }

  constructor(
    code: ErrorCode,
    message: string,
    details: ErrorDetail[] = [],
    request_id: string = 'req_client_generated',
    http_status: number = 400,
    retryAfterSeconds?: number
  ) {
    // Strip HTML/scripts and truncate messages to 200 chars for security & clean UX
    const sanitized = sanitizeErrorMessage(message)
    super(sanitized)
    this.name = 'ApiError'
    this.code = code
    this.details = details
    this.request_id = request_id
    this.http_status = http_status
    this.retryAfterSeconds = retryAfterSeconds
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  static fromEnvelope(
    envelope: ErrorEnvelope,
    httpStatus: number,
    retryAfterSeconds?: number
  ): ApiError {
    const code = mapToErrorCode(envelope.error.code, httpStatus)
    return new ApiError(
      code,
      envelope.error.message,
      envelope.error.details || [],
      envelope.error.request_id || 'req_envelope_trace',
      httpStatus,
      retryAfterSeconds
    )
  }
}

/**
 * Strips script tags, HTML tags, and truncates error messages to 200 characters.
 */
function sanitizeErrorMessage(msg: string): string {
  if (!msg) return 'An unexpected error occurred.'
  const stripped = msg.replace(/<[^>]*>?/gm, '').trim()
  if (stripped.length > 200) {
    return `${stripped.slice(0, 197)}...`
  }
  return stripped
}

/**
 * Maps raw backend string codes to strict ErrorCode union.
 */
function mapToErrorCode(rawCode: string, httpStatus: number): ErrorCode {
  const normalized = (rawCode || '').toUpperCase()
  if (normalized === 'VALIDATION_ERROR') return 'VALIDATION_ERROR'
  if (normalized === 'INVALID_URL') return 'INVALID_URL'
  if (normalized === 'INPUT_TOO_LARGE' || normalized === 'PAYLOAD_TOO_LARGE')
    return 'INPUT_TOO_LARGE'
  if (normalized === 'RATE_LIMITED') return 'RATE_LIMITED'
  if (normalized === 'NOT_FOUND') return 'NOT_FOUND'
  if (normalized === 'DEPENDENCY_UNAVAILABLE') return 'DEPENDENCY_UNAVAILABLE'
  if (normalized === 'TIMEOUT') return 'TIMEOUT'
  if (normalized === 'INVALID_RESPONSE') return 'INVALID_RESPONSE'

  if (normalized === 'UNAUTHENTICATED') return 'UNAUTHENTICATED'
  if (normalized === 'FORBIDDEN') return 'FORBIDDEN'

  if (httpStatus === 401) return 'UNAUTHENTICATED'
  if (httpStatus === 403) return 'FORBIDDEN'
  if (httpStatus === 422) return 'VALIDATION_ERROR'
  if (httpStatus === 413) return 'INPUT_TOO_LARGE'
  if (httpStatus === 429) return 'RATE_LIMITED'
  if (httpStatus === 404) return 'NOT_FOUND'
  if (httpStatus >= 500) return 'INTERNAL_ERROR'

  return 'INTERNAL_ERROR'
}

/**
 * Universal error normalizer.
 * Safely parses FastAPI validation formats, CIPHER AI standard envelopes,
 * DOMExceptions (timeouts), and raw Fetch network exceptions.
 */
export function normalizeApiError(
  err: unknown,
  httpStatus?: number,
  requestId?: string,
  retryAfterSeconds?: number
): ApiError {
  if (err instanceof ApiError) {
    return err
  }

  // Handle AbortController timeout / abort
  if (err instanceof DOMException && err.name === 'AbortError') {
    return new ApiError(
      'TIMEOUT',
      'The security analysis request timed out. Please verify connectivity and retry.',
      [],
      requestId || 'req_timeout_trace',
      408
    )
  }

  // Handle standard network TypeError
  if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
    return new ApiError(
      'NETWORK_ERROR',
      'Cannot reach the CIPHER AI backend service. Please check your connection.',
      [],
      requestId || 'req_network_trace',
      0
    )
  }

  // Check if raw error object is an envelope
  if (err && typeof err === 'object') {
    const maybeObj = err as Record<string, unknown>

    // Standard CIPHER AI envelope: { error: { code, message, details, request_id } }
    if (maybeObj.error && typeof maybeObj.error === 'object') {
      const inner = maybeObj.error as Record<string, unknown>
      const details: ErrorDetail[] = Array.isArray(inner.details)
        ? (inner.details as ErrorDetail[])
        : []

      return new ApiError(
        mapToErrorCode(String(inner.code || ''), httpStatus || 400),
        String(inner.message || 'Request validation or processing failed.'),
        details,
        String(inner.request_id || requestId || 'req_trace'),
        httpStatus || 400,
        retryAfterSeconds
      )
    }

    // Default FastAPI 422 format: { detail: [ { loc, msg, type } ] }
    if (Array.isArray(maybeObj.detail)) {
      const details: ErrorDetail[] = maybeObj.detail.map((d: Record<string, unknown>) => {
        const field = Array.isArray(d.loc) ? d.loc.filter((p) => p !== 'body').join('.') : null
        return {
          field: field || null,
          issue: String(d.msg || 'Invalid field value.'),
        }
      })

      return new ApiError(
        'VALIDATION_ERROR',
        details.length > 0 ? details[0].issue : 'Request validation failed.',
        details,
        requestId || 'req_fastapi_val_trace',
        httpStatus || 422
      )
    }
  }

  const rawMsg = err instanceof Error ? err.message : String(err)
  return new ApiError(
    httpStatus && httpStatus >= 500 ? 'INTERNAL_ERROR' : 'INTERNAL_ERROR',
    rawMsg || 'An unexpected error occurred.',
    [],
    requestId || 'req_unknown_trace',
    httpStatus || 500
  )
}
