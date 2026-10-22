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

export * from './history'
export * from './dashboard'
export * from './cases'

import type {
  ListScansParams,
  ListScansResponse,
  ScanSummaryItem,
  UpdateScanParams,
} from './history'
import type { DashboardSummaryResponse } from './dashboard'
import type {
  CaseDetailResponse,
  CaseNoteResponse,
  CaseResponse,
  CreateCaseParams,
  ListCasesResponse,
  UpdateCaseParams,
} from './cases'

// Backward-compatible ScanSummary alias
export interface ScanSummary {
  id: string
  scan_type: ScanType
  display_value: string
  risk_score: number
  risk_level: RiskLevel
  created_at: string
}

// Backward-compatible DashboardSummary alias
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

/**
 * Core CIPHER AI Data Access Interface.
 */
export interface CipherApi {
  scanUrl(input: ScanUrlInput): Promise<ThreatReport>
  scanMessage(input: ScanMessageInput): Promise<ThreatReport>
  listScans(params?: ListScansParams): Promise<ListScansResponse>
  getScan(scanId: string): Promise<ThreatReport>
  updateScan?(scanId: string, params: UpdateScanParams): Promise<ScanSummaryItem>
  deleteScan(scanId: string): Promise<void>
  getDashboardSummary(rangeDays?: number): Promise<DashboardSummaryResponse>

  // Cases and Notes
  listCases?(params?: { status?: string; limit?: number; cursor?: string }): Promise<ListCasesResponse>
  getCase?(caseId: string): Promise<CaseDetailResponse>
  createCase?(params: CreateCaseParams): Promise<CaseResponse>
  updateCase?(caseId: string, params: UpdateCaseParams): Promise<CaseResponse>
  deleteCase?(caseId: string): Promise<void>
  attachScan?(caseId: string, scanId: string): Promise<{ case_id: string; scan_id: string }>
  detachScan?(caseId: string, scanId: string): Promise<void>
  addNote?(caseId: string, body: string): Promise<CaseNoteResponse>
  updateNote?(caseId: string, noteId: string, body: string): Promise<CaseNoteResponse>
  deleteNote?(caseId: string, noteId: string): Promise<void>
}
