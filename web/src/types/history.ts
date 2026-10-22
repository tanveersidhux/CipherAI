import type { RiskLevel, ScanType, ThreatReport } from './threat-report'

export interface ScanSummaryItem {
  id: string
  scan_type: ScanType
  title: string
  input_preview: string
  display_value?: string
  risk_score: number
  risk_level: RiskLevel
  is_pinned: boolean
  tags: string[]
  created_at: string
}

export interface ListScansParams {
  limit?: number
  cursor?: string
  scan_type?: 'url' | 'message'
  risk_level?: string
  from?: string
  to?: string
  q?: string
  tag?: string
  pinned?: boolean
}

export interface ListScansResponse {
  items: ScanSummaryItem[]
  next_cursor: string | null
}

export interface UpdateScanParams {
  title?: string
  is_pinned?: boolean
  tags?: string[]
}

export interface StoredScanDetail extends ThreatReport {
  id?: string
  title?: string
  is_pinned: boolean
  tags: string[]
  case_ids: string[]
  rescan_of_scan_id?: string | null
}

export interface RescanComparison {
  previous_risk_score: number
  new_risk_score: number
  previous_risk_level: RiskLevel
  new_risk_level: RiskLevel
  changed_indicators: string[]
}

export interface RescanResponse {
  scan: ThreatReport
  comparison: RescanComparison
}
