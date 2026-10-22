import type {
  RiskLevel,
  ScanType,
  ThreatReport,
} from './threat-report'

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_URL'
  | 'INPUT_TOO_LARGE'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'RATE_LIMITED'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'INTERNAL_ERROR'

export interface ErrorDetail {
  field: string | null
  issue: string
}

export interface ErrorEnvelope {
  error: {
    code: ErrorCode
    message: string
    details: ErrorDetail[]
    request_id: string
  }
}

/**
 * Standardized ApiError thrown by CipherApi methods on non-2xx responses.
 */
export class ApiError extends Error {
  readonly code: ErrorCode
  readonly details: ErrorDetail[]
  readonly request_id: string
  readonly http_status: number

  constructor(
    code: ErrorCode,
    message: string,
    details: ErrorDetail[] = [],
    request_id: string = 'req_mock_error_trace',
    http_status: number = 400
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
    this.request_id = request_id
    this.http_status = http_status
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  static fromEnvelope(envelope: ErrorEnvelope, httpStatus: number): ApiError {
    return new ApiError(
      envelope.error.code,
      envelope.error.message,
      envelope.error.details,
      envelope.error.request_id,
      httpStatus
    )
  }
}

export interface ScanSummary {
  id: string
  scan_type: ScanType
  display_value: string
  risk_score: number
  risk_level: RiskLevel
  created_at: string
}

export interface DashboardSummary {
  total_scans: number
  by_risk_level: Record<RiskLevel, number>
  by_scan_type: Record<string, number>
  recent_scans: ScanSummary[]
  top_indicators: Array<{
    indicator_id: string
    title: string
    count: number
  }>
  time_series: Array<{
    date: string
    count: number
  }>
}

export interface ScanUrlInput {
  url: string
  options?: {
    use_ai?: boolean
    persist?: boolean
  }
}

export interface ScanMessageInput {
  message: string
  channel?: 'sms' | 'email_body' | 'chat' | 'social' | 'unknown'
  options?: {
    use_ai?: boolean
    persist?: boolean
  }
}

export interface ListScansParams {
  limit?: number
  cursor?: string
  risk_level?: string
  scan_type?: string
}

export interface ListScansResponse {
  items: ScanSummary[]
  next_cursor: string | null
}

/**
 * Core CIPHER AI Data Access Interface.
 * Implemented by MockCipherApi in Phase 02 and HttpCipherApi in Phase 06.
 */
export interface CipherApi {
  scanUrl(input: ScanUrlInput): Promise<ThreatReport>
  scanMessage(input: ScanMessageInput): Promise<ThreatReport>
  listScans(params?: ListScansParams): Promise<ListScansResponse>
  getScan(scanId: string): Promise<ThreatReport>
  deleteScan(scanId: string): Promise<void>
  getDashboardSummary(): Promise<DashboardSummary>
}
