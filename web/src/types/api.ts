import type {
  RiskLevel,
  ScanType,
  ThreatReport,
} from './threat-report'

export type {
  ErrorCode,
  ErrorDetail,
  ErrorEnvelope,
} from '@/lib/api/errors'
export { ApiError } from '@/lib/api/errors'

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
