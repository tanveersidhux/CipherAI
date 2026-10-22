import type {
  CipherApi,
  DashboardSummary,
  ListScansParams,
  ListScansResponse,
  ScanMessageInput,
  ScanSummary,
  ScanUrlInput,
} from '@/types/api'
import { ApiError } from '@/types/api'
import type { RiskLevel, ThreatReport } from '@/types/threat-report'
import {
  ALL_MOCK_FIXTURES,
  adversarialReportFixture,
  criticalReportFixture,
  fallbackAiReportFixture,
  highReportFixture,
  inconclusiveReportFixture,
  lowReportFixture,
  mediumReportFixture,
} from './fixtures'
import { defangUrl } from '@/lib/defang'

/**
 * In-memory Mock implementation of the CipherApi interface.
 * Simulates realistic network latency and configurable failure injection.
 * Phase 06 replaces this with HttpCipherApi without changing any component props.
 */
export class MockCipherApi implements CipherApi {
  private reports: Map<string, ThreatReport> = new Map()
  private latencyMs: number

  constructor(latencyMs: number = 350) {
    this.latencyMs = latencyMs
    // Seed in-memory store with canonical fixtures
    for (const fixture of ALL_MOCK_FIXTURES) {
      this.reports.set(fixture.report_id, fixture)
    }
  }

  private async delay(): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs))
    }
  }

  async scanUrl(input: ScanUrlInput): Promise<ThreatReport> {
    await this.delay()

    const target = input.url.toLowerCase().trim()

    // Failure simulation hooks for test suites and dev state exploration
    if (target.includes('simulate-rate-limit')) {
      throw new ApiError(
        'RATE_LIMITED',
        'Scan request frequency limit exceeded. Please retry after a brief delay.',
        [{ field: 'url', issue: 'Rate limit: 30 requests per minute exceeded.' }],
        'req_rate_limit_sim_01',
        429
      )
    }

    if (target.includes('simulate-unavailable')) {
      throw new ApiError(
        'DEPENDENCY_UNAVAILABLE',
        'The security evaluation subsystem is temporarily unreachable.',
        [{ field: null, issue: 'Backend connection timeout.' }],
        'req_unavail_sim_02',
        503
      )
    }

    if (target.includes('simulate-invalid')) {
      throw new ApiError(
        'INVALID_URL',
        'The submitted string does not conform to RFC 3986 URL syntax.',
        [{ field: 'url', issue: 'Malformed host or port specification.' }],
        'req_invalid_sim_03',
        422
      )
    }

    // Match fixture profiles based on URL content
    if (target.includes('adversarial') || target.includes('раураӏ') || target.length > 250) {
      return this.persistAndReturn(adversarialReportFixture)
    }
    if (target.includes('inconclusive') || target.includes('[invalid')) {
      return this.persistAndReturn(inconclusiveReportFixture)
    }
    if (target.includes('low') || target.includes('docs.example')) {
      return this.persistAndReturn(lowReportFixture)
    }
    if (target.includes('medium') || target.includes('subdomain')) {
      return this.persistAndReturn(mediumReportFixture)
    }
    if (target.includes('high') || target.includes('parcel')) {
      return this.persistAndReturn(fallbackAiReportFixture)
    }

    // Default to critical phishing fixture or create a dynamic report
    const newReport: ThreatReport = {
      ...criticalReportFixture,
      report_id: crypto.randomUUID ? crypto.randomUUID() : `mock-${Date.now()}`,
      created_at: new Date().toISOString(),
      input: {
        display_value: defangUrl(input.url),
        normalized_value: input.url,
        input_hash: 'd04b98f48e8f8bcc15c6ae5ac050801cd6dcfd428fb5f9e65c4e16e7807340fa',
        input_length: input.url.length,
      },
    }

    return this.persistAndReturn(newReport)
  }

  async scanMessage(input: ScanMessageInput): Promise<ThreatReport> {
    await this.delay()

    const text = input.message.toLowerCase()

    if (text.includes('simulate-rate-limit')) {
      throw new ApiError(
        'RATE_LIMITED',
        'Rate limit reached. Please wait before scanning another message.',
        [],
        'req_msg_rate_01',
        429
      )
    }

    if (text.includes('fallback') || text.includes('package') || text.includes('parcel')) {
      return this.persistAndReturn(fallbackAiReportFixture)
    }

    if (text.includes('inconclusive')) {
      return this.persistAndReturn(inconclusiveReportFixture)
    }

    return this.persistAndReturn(highReportFixture)
  }

  async listScans(params?: ListScansParams): Promise<ListScansResponse> {
    await this.delay()

    let items: ScanSummary[] = Array.from(this.reports.values()).map((r) => ({
      id: r.report_id,
      scan_type: r.scan_type,
      display_value: r.input.display_value,
      risk_score: r.assessment.risk_score,
      risk_level: r.assessment.risk_level,
      created_at: r.created_at,
    }))

    // Sort descending by date
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
      next_cursor: items.length > limit ? 'mock_next_cursor' : null,
    }
  }

  async getScan(scanId: string): Promise<ThreatReport> {
    await this.delay()
    const found = this.reports.get(scanId)
    if (!found) {
      throw new ApiError(
        'NOT_FOUND',
        `Threat report with ID "${scanId}" was not found.`,
        [{ field: 'scan_id', issue: 'Resource does not exist or has expired.' }],
        'req_not_found_01',
        404
      )
    }
    return found
  }

  async deleteScan(scanId: string): Promise<void> {
    await this.delay()
    if (!this.reports.has(scanId)) {
      throw new ApiError(
        'NOT_FOUND',
        `Threat report with ID "${scanId}" was not found or was already deleted.`,
        [],
        'req_del_404',
        404
      )
    }
    this.reports.delete(scanId)
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    await this.delay()

    const allReports = Array.from(this.reports.values())
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

    for (const report of allReports) {
      by_risk_level[report.assessment.risk_level] =
        (by_risk_level[report.assessment.risk_level] ?? 0) + 1
      by_scan_type[report.scan_type] =
        (by_scan_type[report.scan_type] ?? 0) + 1
    }

    const recent_scans: ScanSummary[] = allReports.slice(0, 5).map((r) => ({
      id: r.report_id,
      scan_type: r.scan_type,
      display_value: r.input.display_value,
      risk_score: r.assessment.risk_score,
      risk_level: r.assessment.risk_level,
      created_at: r.created_at,
    }))

    return {
      total_scans: allReports.length,
      by_risk_level,
      by_scan_type,
      recent_scans,
      top_indicators: [
        {
          indicator_id: 'URL_IP_HOST',
          title: 'IP Address Used as Hostname',
          count: 14,
        },
        {
          indicator_id: 'URL_CREDENTIAL_PATH_KEYWORD',
          title: 'Credential Keywords in Path',
          count: 11,
        },
        {
          indicator_id: 'MSG_URGENCY_DEADLINE',
          title: 'Artificial Urgency or Strict Deadline',
          count: 8,
        },
        {
          indicator_id: 'URL_HOMOGLYPH_CYRILLIC',
          title: 'Cyrillic Homoglyph Characters',
          count: 5,
        },
      ],
      time_series: [
        { date: '2026-10-16', count: 3 },
        { date: '2026-10-17', count: 5 },
        { date: '2026-10-18', count: 2 },
        { date: '2026-10-19', count: 7 },
        { date: '2026-10-20', count: 9 },
        { date: '2026-10-21', count: 6 },
        { date: '2026-10-22', count: 12 },
      ],
    }
  }

  private persistAndReturn(report: ThreatReport): ThreatReport {
    this.reports.set(report.report_id, report)
    return report
  }
}
