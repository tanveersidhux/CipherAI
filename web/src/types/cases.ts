import type { ScanSummaryItem } from './history'

export type CaseStatus = 'open' | 'in_progress' | 'resolved' | 'archived'
export type CasePriority = 'low' | 'medium' | 'high'
export type TimelineEventType = 'note_added' | 'scan_attached' | 'scan_detached' | 'status_changed'

export interface CreateCaseParams {
  title: string
  description?: string
  priority?: CasePriority
  scan_ids?: string[]
}

export interface UpdateCaseParams {
  title?: string
  description?: string
  status?: CaseStatus
  priority?: CasePriority
}

export interface CaseResponse {
  id: string
  title: string
  description: string | null
  status: CaseStatus
  priority: CasePriority
  scan_count: number
  created_at: string
  updated_at: string
}

export interface ListCasesResponse {
  items: CaseResponse[]
  next_cursor: string | null
}

export interface CaseNoteResponse {
  id: string
  case_id: string
  body: string
  created_at: string
  updated_at: string
}

export interface CaseTimelineItem {
  type: TimelineEventType
  occurred_at: string
  reference_id: string | null
  summary: string
}

export interface CaseDetailResponse {
  id: string
  title: string
  description: string | null
  status: CaseStatus
  priority: CasePriority
  scan_count: number
  created_at: string
  updated_at: string
  scans: ScanSummaryItem[]
  notes: CaseNoteResponse[]
  highest_risk_level: string | null
  timeline: CaseTimelineItem[]
}
