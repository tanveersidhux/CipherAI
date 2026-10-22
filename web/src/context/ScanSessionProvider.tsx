/**
 * In-Memory Session Scan Store & Context Provider.
 * Stores up to 10 completed scan summaries for dashboard and session history.
 *
 * PRIVACY INVARIANT:
 * Never stores raw message bodies or sensitive query parameters in browser storage.
 * Only short defanged/truncated labels, risk metrics, and timestamps are held.
 *
 * TODO(Phase 07): Swap in-memory storage for Supabase database persistence and RLS.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { ThreatReport, RiskLevel, ScanType } from '@/types/threat-report'
import type { ScanSummary } from '@/types/api'
import { truncateForDisplay } from '@/lib/defang'

export interface ScanSessionContextValue {
  recentScans: ScanSummary[]
  addScan: (report: ThreatReport) => void
  listScans: () => ScanSummary[]
  clear: () => void
  getScanReport: (reportId: string) => ThreatReport | undefined
}

const MAX_SESSION_SCANS = 10

const DEFAULT_SESSION_CONTEXT: ScanSessionContextValue = {
  recentScans: [],
  addScan: () => {},
  listScans: () => [],
  clear: () => {},
  getScanReport: () => undefined,
}

export const ScanSessionContext = createContext<ScanSessionContextValue>(DEFAULT_SESSION_CONTEXT)

export function ScanSessionProvider({ children }: { children: React.ReactNode }) {
  // Full ThreatReport objects stored in ephemeral memory (lost on page reload)
  const [reportsMap, setReportsMap] = useState<Map<string, ThreatReport>>(() => new Map())
  // Non-sensitive summaries ordered newest first
  const [summaries, setSummaries] = useState<ScanSummary[]>([])

  const addScan = useCallback((report: ThreatReport) => {
    // 1. Create non-sensitive summary
    const truncatedLabel =
      report.scan_type === 'message'
        ? truncateForDisplay(report.input.display_value, 50).display
        : report.input.display_value

    const summary: ScanSummary = {
      id: report.report_id,
      scan_type: report.scan_type as ScanType,
      display_value: truncatedLabel,
      risk_score: report.assessment.risk_score,
      risk_level: report.assessment.risk_level as RiskLevel,
      created_at: report.created_at,
    }

    setReportsMap((prev) => {
      const next = new Map(prev)
      next.set(report.report_id, report)
      return next
    })

    setSummaries((prev) => {
      const filtered = prev.filter((s) => s.id !== report.report_id)
      const next = [summary, ...filtered].slice(0, MAX_SESSION_SCANS)
      return next
    })
  }, [])

  const listScans = useCallback(() => summaries, [summaries])

  const clear = useCallback(() => {
    setReportsMap(new Map())
    setSummaries([])
  }, [])

  const getScanReport = useCallback(
    (reportId: string) => reportsMap.get(reportId),
    [reportsMap]
  )

  const value = useMemo<ScanSessionContextValue>(
    () => ({
      recentScans: summaries,
      addScan,
      listScans,
      clear,
      getScanReport,
    }),
    [summaries, addScan, listScans, clear, getScanReport]
  )

  return (
    <ScanSessionContext.Provider value={value}>
      {children}
    </ScanSessionContext.Provider>
  )
}

/**
 * Hook to consume session-local scan history.
 */
export function useScanSession(): ScanSessionContextValue {
  return useContext(ScanSessionContext)
}
