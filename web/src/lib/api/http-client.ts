/**
 * Full HttpCipherApi implementation connecting Phase 02-07 UI to FastAPI backend.
 * Provides authenticated persistence with Supabase, case management, and seamless guest fallback.
 */

import type {
  CipherApi,
  DashboardSummaryResponse,
  ListScansParams,
  ListScansResponse,
  ScanMessageInput,
  ScanSummaryItem,
  ScanUrlInput,
  UpdateScanParams,
  CaseResponse,
  ListCasesResponse,
  CaseDetailResponse,
  CreateCaseParams,
  UpdateCaseParams,
  CaseNoteResponse,
} from '@/types/api'
import { ApiError } from './errors'
import type { ThreatReport } from '@/types/threat-report'
import { scanUrl as fetchScanUrl, scanMessage as fetchScanMessage } from './scan'
import { truncateForDisplay } from '@/lib/defang'
import { apiFetch } from './client'

export class HttpCipherApi implements CipherApi {
  // In-memory session store for unauthenticated guest mode
  private sessionReports: Map<string, ThreatReport> = new Map()

  async scanUrl(input: ScanUrlInput): Promise<ThreatReport> {
    const report = await fetchScanUrl({
      url: input.url,
      options: input.options,
    })
    this.sessionReports.set(report.report_id, report)
    return report
  }

  async scanMessage(input: ScanMessageInput): Promise<ThreatReport> {
    const report = await fetchScanMessage({
      message: input.message,
      channel: input.channel,
      options: input.options,
    })
    this.sessionReports.set(report.report_id, report)
    return report
  }

  async listScans(params?: ListScansParams): Promise<ListScansResponse> {
    const query = new URLSearchParams()
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.cursor) query.set('cursor', params.cursor)
    if (params?.scan_type && (params.scan_type as string) !== 'all') query.set('scan_type', params.scan_type)
    if (params?.risk_level && params.risk_level !== 'all') query.set('risk_level', params.risk_level)
    if (params?.from) query.set('from', params.from)
    if (params?.to) query.set('to', params.to)
    if (params?.q) query.set('q', params.q)
    if (params?.tag) query.set('tag', params.tag)
    if (params?.pinned !== undefined) query.set('pinned', String(params.pinned))

    try {
      const qs = query.toString() ? `?${query.toString()}` : ''
      const res = await apiFetch<ListScansResponse>(`/api/v1/scans${qs}`)
      return res.data
    } catch (err) {
      if (err instanceof ApiError && (err.http_status === 401 || err.status === 401)) {
        // Fall back to guest session scans
        return this.listSessionScans(params)
      }
      throw err
    }
  }

  private listSessionScans(params?: ListScansParams): ListScansResponse {
    let items: ScanSummaryItem[] = Array.from(this.sessionReports.values()).map((r) => ({
      id: r.report_id,
      scan_type: r.scan_type,
      title: r.input.display_value,
      input_preview:
        r.scan_type === 'message'
          ? truncateForDisplay(r.input.display_value, 50).display
          : r.input.display_value,
      risk_score: r.assessment.risk_score,
      risk_level: r.assessment.risk_level,
      is_pinned: false,
      tags: [],
      created_at: r.created_at,
    }))

    items.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    if (params?.risk_level && params.risk_level !== 'all') {
      items = items.filter((item) => item.risk_level === params.risk_level)
    }

    if (params?.scan_type && (params.scan_type as string) !== 'all') {
      items = items.filter((item) => item.scan_type === params.scan_type)
    }

    const limit = params?.limit ?? 20
    const paged = items.slice(0, limit)

    return {
      items: paged,
      next_cursor: items.length > limit ? 'session_next_cursor' : null,
    }
  }

  async getScan(scanId: string): Promise<ThreatReport> {
    try {
      const res = await apiFetch<ThreatReport>(`/api/v1/scans/${scanId}`)
      return res.data
    } catch (err) {
      // Fall back to session report if guest
      const found = this.sessionReports.get(scanId)
      if (found) {
        return found
      }
      try {
        const raw = sessionStorage.getItem('cipher_session_reports')
        if (raw) {
          const map = new Map<string, ThreatReport>(JSON.parse(raw))
          const fromStorage = map.get(scanId)
          if (fromStorage) return fromStorage
        }
      } catch {
        // ignore
      }
      throw err
    }
  }

  async updateScan(scanId: string, params: UpdateScanParams): Promise<ScanSummaryItem> {
    const res = await apiFetch<ScanSummaryItem>(`/api/v1/scans/${scanId}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    })
    return res.data
  }

  async deleteScan(scanId: string): Promise<void> {
    try {
      await apiFetch<void>(`/api/v1/scans/${scanId}`, {
        method: 'DELETE',
      })
    } catch (err) {
      if (this.sessionReports.has(scanId)) {
        this.sessionReports.delete(scanId)
        return
      }
      throw err
    }
  }

  async getDashboardSummary(rangeDays = 30): Promise<DashboardSummaryResponse> {
    try {
      const res = await apiFetch<DashboardSummaryResponse>(`/api/v1/dashboard/summary?range_days=${rangeDays}`)
      return res.data
    } catch (err) {
      if (err instanceof ApiError && (err.http_status === 401 || err.status === 401)) {
        return this.computeSessionDashboard()
      }
      throw err
    }
  }

  private computeSessionDashboard(): DashboardSummaryResponse {
    const allReports = Array.from(this.sessionReports.values())

    const riskCounts: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
      inconclusive: 0,
    }

    const categoryCounts = new Map<string, number>()

    for (const report of allReports) {
      riskCounts[report.assessment.risk_level] =
        (riskCounts[report.assessment.risk_level] ?? 0) + 1

      for (const ind of report.indicators) {
        if (ind.triggered) {
          categoryCounts.set(ind.category, (categoryCounts.get(ind.category) || 0) + 1)
        }
      }
    }

    const risk_distribution = Object.entries(riskCounts).map(([risk_level, count]) => ({
      risk_level,
      count,
    }))

    const top_indicator_categories = Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const recent_scans: ScanSummaryItem[] = allReports
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((r) => ({
        id: r.report_id,
        scan_type: r.scan_type,
        title: r.input.display_value,
        input_preview:
          r.scan_type === 'message'
            ? truncateForDisplay(r.input.display_value, 50).display
            : r.input.display_value,
        display_value: r.input.display_value,
        risk_score: r.assessment.risk_score,
        risk_level: r.assessment.risk_level,
        is_pinned: false,
        tags: [],
        created_at: r.created_at,
      }))

    const high_or_critical = (riskCounts['high'] || 0) + (riskCounts['critical'] || 0)

    return {
      totals: {
        total_scans: allReports.length,
        scans_last_7_days: allReports.length,
        high_or_critical_scans: high_or_critical,
        inconclusive_scans: riskCounts['inconclusive'] || 0,
        open_cases: 0,
      },
      risk_distribution,
      scans_over_time: [],
      top_indicator_categories,
      recent_scans,
      generated_at: new Date().toISOString(),
    }
  }

  // --- Investigation Cases ---

  async listCases(params?: { status?: string; limit?: number; cursor?: string }): Promise<ListCasesResponse> {
    const query = new URLSearchParams()
    if (params?.status && params.status !== 'all') query.set('status', params.status)
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.cursor) query.set('cursor', params.cursor)

    const qs = query.toString() ? `?${query.toString()}` : ''
    const res = await apiFetch<ListCasesResponse>(`/api/v1/cases${qs}`)
    return res.data
  }

  async getCase(caseId: string): Promise<CaseDetailResponse> {
    const res = await apiFetch<CaseDetailResponse>(`/api/v1/cases/${caseId}`)
    return res.data
  }

  async createCase(params: CreateCaseParams): Promise<CaseResponse> {
    const res = await apiFetch<CaseResponse>('/api/v1/cases', {
      method: 'POST',
      body: JSON.stringify(params),
    })
    return res.data
  }

  async updateCase(caseId: string, params: UpdateCaseParams): Promise<CaseResponse> {
    const res = await apiFetch<CaseResponse>(`/api/v1/cases/${caseId}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    })
    return res.data
  }

  async deleteCase(caseId: string): Promise<void> {
    await apiFetch<void>(`/api/v1/cases/${caseId}`, {
      method: 'DELETE',
    })
  }

  async attachScan(caseId: string, scanId: string): Promise<{ case_id: string; scan_id: string }> {
    const res = await apiFetch<{ case_id: string; scan_id: string }>(`/api/v1/cases/${caseId}/scans`, {
      method: 'POST',
      body: JSON.stringify({ scan_id: scanId }),
    })
    return res.data
  }

  async detachScan(caseId: string, scanId: string): Promise<void> {
    await apiFetch<void>(`/api/v1/cases/${caseId}/scans/${scanId}`, {
      method: 'DELETE',
    })
  }

  async addNote(caseId: string, body: string): Promise<CaseNoteResponse> {
    const res = await apiFetch<CaseNoteResponse>(`/api/v1/cases/${caseId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    })
    return res.data
  }

  async updateNote(caseId: string, noteId: string, body: string): Promise<CaseNoteResponse> {
    const res = await apiFetch<CaseNoteResponse>(`/api/v1/cases/${caseId}/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    })
    return res.data
  }

  async deleteNote(caseId: string, noteId: string): Promise<void> {
    await apiFetch<void>(`/api/v1/cases/${caseId}/notes/${noteId}`, {
      method: 'DELETE',
    })
  }
}
