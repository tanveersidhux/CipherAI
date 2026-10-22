import type { ScanSummaryItem } from './history'

export interface DashboardTotals {
  total_scans: number
  scans_last_7_days: number
  high_or_critical_scans: number
  inconclusive_scans: number
  open_cases: number
}

export interface RiskDistributionItem {
  risk_level: string
  count: number
}

export interface ScansOverTimeItem {
  date: string
  count: number
  high_or_critical: number
}

export interface TopIndicatorCategoryItem {
  category: string
  count: number
}

export interface DashboardSummaryResponse {
  totals: DashboardTotals
  risk_distribution: RiskDistributionItem[]
  scans_over_time: ScansOverTimeItem[]
  top_indicator_categories: TopIndicatorCategoryItem[]
  recent_scans: ScanSummaryItem[]
  generated_at: string
}
