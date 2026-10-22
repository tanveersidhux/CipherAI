/**
 * Real HttpCipherApi implementation connecting Phase 02/06 UI to FastAPI backend.
 * Replaces MockCipherApi while maintaining full backward-compatibility with the CipherApi interface.
 */

import type {
  CipherApi,
  DashboardSummary,
  ListScansParams,
  ListScansResponse,
  ScanMessageInput,
  ScanSummary,
  ScanUrlInput,
} from '@/types/api'
import { ApiError } from './errors'
import type { RiskLevel, ThreatReport } from '@/types/threat-report'
import { scanUrl as fetchScanUrl, scanMessage as fetchScanMessage } from './scan'
import { truncateForDisplay } from '@/lib/defang'

export class HttpCipherApi implements CipherApi {
  // Ephemeral in-memory store for session scans until Phase 07 Supabase persistence
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
    let items: ScanSummary[] = Array.from(this.sessionReports.values()).map((r) => ({
      id: r.report_id,
      scan_type: r.scan_type,
      display_value:
        r.scan_type === 'message'
          ? truncateForDisplay(r.input.display_value, 50).display
          : r.input.display_value,
      risk_score: r.assessment.risk_score,
      risk_level: r.assessment.risk_level,
      created_at: r.created_at,
    }))

    // Order newest first
    items.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    if (params?.risk_level && params.risk_level !== 'all') {
      items = items.filter((item) => item.risk_level === params.risk_level)
    }

    if (params?.scan_type && params.scan_type !== 'all') {
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
    const found = this.sessionReports.get(scanId)
    if (!found) {
      throw new ApiError(
        'NOT_FOUND',
        `Threat report "${scanId}" was not found in this session.`,
        [{ field: 'scan_id', issue: 'Report not found or session expired.' }],
        'req_not_found_trace',
        404
      )
    }
    return found
  }

  async deleteScan(scanId: string): Promise<void> {
    if (!this.sessionReports.has(scanId)) {
      throw new ApiError(
        'NOT_FOUND',
        `Threat report "${scanId}" does not exist.`,
        [],
        'req_del_404_trace',
        404
      )
    }
    this.sessionReports.delete(scanId)
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const allReports = Array.from(this.sessionReports.values())

    const by_risk_level: Record<RiskLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
      inconclusive: 0,
    }

    const by_scan_type: Record<string, number> = {
      url: 0,
      message: 0,
      email: 0,
      batch_item: 0,
    }

    const indicatorCounts = new Map<string, { title: string; count: number }>()

    for (const report of allReports) {
      by_risk_level[report.assessment.risk_level] =
        (by_risk_level[report.assessment.risk_level] ?? 0) + 1
      by_scan_type[report.scan_type] =
        (by_scan_type[report.scan_type] ?? 0) + 1

      for (const ind of report.indicators) {
        if (ind.triggered) {
          const current = indicatorCounts.get(ind.indicator_id) || {
            title: ind.title,
            count: 0,
          }
          current.count += 1
          indicatorCounts.set(ind.indicator_id, current)
        }
      }
    }

    const recent_scans: ScanSummary[] = allReports
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((r) => ({
        id: r.report_id,
        scan_type: r.scan_type,
        display_value:
          r.scan_type === 'message'
            ? truncateForDisplay(r.input.display_value, 50).display
            : r.input.display_value,
        risk_score: r.assessment.risk_score,
        risk_level: r.assessment.risk_level,
        created_at: r.created_at,
      }))

    const top_indicators = Array.from(indicatorCounts.entries())
      .map(([indicator_id, val]) => ({
        indicator_id,
        title: val.title,
        count: val.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)

    return {
      total_scans: allReports.length,
      by_risk_level,
      by_scan_type,
      recent_scans,
      top_indicators,
      time_series: [],
    }
  }
}
