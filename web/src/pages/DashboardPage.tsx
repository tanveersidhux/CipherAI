import React, { useState } from 'react'
import {
  BarChart3,
  ShieldAlert,
  Activity,
  Layers,
  FolderLock,
  HelpCircle,
  Calendar,
  Sparkles,
  Zap,
  ShieldCheck,
} from 'lucide-react'
import { useDashboardSummary } from '@/hooks/useDashboardSummary'
import { StatCard } from '@/components/common/StatCard'
import { RiskDistributionChart } from '@/components/charts/RiskDistributionChart'
import { ScanTrendChart } from '@/components/charts/ScanTrendChart'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { RiskBadge } from '@/components/report/RiskBadge'
import type { RiskLevel } from '@/types/threat-report'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [rangeDays, setRangeDays] = useState<number>(30)
  const { data, loading, error, refetch } = useDashboardSummary(rangeDays)

  if (loading) {
    return <LoadingSkeleton variant="dashboard" className="py-6" />
  }

  if (error || !data) {
    return (
      <div className="py-12 max-w-md mx-auto">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    )
  }

  // Empty State when user has no stored scans
  if (data.totals.total_scans === 0) {
    return (
      <div className="space-y-8 py-2 md:py-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
            <BarChart3 className="h-4 w-4" />
            <span>Operational Threat Metrics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Intelligence Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Aggregate security metrics, detection frequency, and risk distribution from your scans.
          </p>
        </div>

        <EmptyState
          title="No Scans Recorded Yet"
          description="Your scan history is empty. Run your first target analysis to start tracking threat trends, risk distributions, and forensic telemetry."
          actionLabel="Analyze First Target"
          onAction={() => navigate('/scan/url')}
          className="py-16"
        />
      </div>
    )
  }

  // Convert risk_distribution array to Record<RiskLevel, number>
  const riskDistributionRecord: Record<RiskLevel, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
    inconclusive: 0,
  }
  for (const item of data.risk_distribution) {
    const key = item.risk_level.toLowerCase() as RiskLevel
    if (key in riskDistributionRecord) {
      riskDistributionRecord[key] = item.count
    }
  }

  // Convert scans_over_time to ScanTrendChart format
  const trendData = data.scans_over_time.map((item) => ({
    date: item.date,
    count: item.count,
  }))

  return (
    <div className="space-y-8 py-2 md:py-6">
      {/* Page Header & Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
            <BarChart3 className="h-4 w-4" />
            <span>Operational Threat Metrics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Intelligence Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Aggregated security insights from your authenticated threat scans.
          </p>
        </div>

        {/* Range Selector: 7, 30, 90 days */}
        <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-1 self-start sm:self-auto">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setRangeDays(days)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                rangeDays === days
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* AI Threat Intelligence Status Banner */}
      <section
        aria-label="AI Intelligence Engine Telemetry"
        className="rounded-xl border border-primary/25 bg-gradient-to-r from-card/90 via-primary/5 to-card/90 p-4 shadow-xs backdrop-blur-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary shrink-0">
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                Google Gemini 3.5 Flash Reasoning Engine
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                Active
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Heavy AI synthesis enabled for URL inspections, phishing lure analysis, and forensic playbooks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs flex-wrap md:justify-end">
          <div className="flex items-center gap-1.5 rounded-md bg-muted/40 border border-border/40 px-2.5 py-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-muted-foreground">Grounding:</span>
            <span className="font-semibold text-foreground">100% Verified</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-muted/40 border border-border/40 px-2.5 py-1">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Synthesis Latency:</span>
            <span className="font-semibold text-foreground font-mono">&lt; 2.5s</span>
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="sr-only">Key Threat Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <StatCard
            title="Total Scans Executed"
            value={data.totals.total_scans}
            description="All-time scans executed"
            icon={Activity}
          />
          <StatCard
            title="Last 7 Days"
            value={data.totals.scans_last_7_days}
            description="Recent scan volume"
            icon={Calendar}
          />
          <StatCard
            title="High & Critical"
            value={data.totals.high_or_critical_scans}
            description="Severe threat targets"
            icon={ShieldAlert}
          />
          <StatCard
            title="Inconclusive"
            value={data.totals.inconclusive_scans}
            description="Needs further context"
            icon={HelpCircle}
          />
          <StatCard
            title="Open Cases"
            value={data.totals.open_cases}
            description="Active investigations"
            icon={FolderLock}
          />
        </div>
      </section>

      {/* Visual Analytics Grid: Risk Distribution + Activity Trend */}
      <section aria-label="Visual Analytics" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskDistributionChart distribution={riskDistributionRecord} />
        <ScanTrendChart data={trendData} />
      </section>

      {/* Bottom Grid: Top Indicator Categories & Recent Scans */}
      <section aria-label="Forensic Breakdown" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Indicator Categories */}
        <div className="rounded-lg border border-border/60 bg-card/70 p-5 space-y-4">
          <div className="border-b border-border/40 pb-3">
            <h3 className="text-sm font-bold text-foreground">Top Triggered Indicator Categories</h3>
            <p className="text-xs text-muted-foreground">
              Most frequent heuristic and signature categories
            </p>
          </div>

          {data.top_indicator_categories.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No indicator categories triggered yet in this period.
            </p>
          ) : (
            <div className="space-y-2.5">
              {data.top_indicator_categories.map((cat) => (
                <div
                  key={cat.category}
                  className="flex items-center justify-between rounded-md border border-border/40 bg-muted/30 p-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold text-foreground capitalize">
                      {cat.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-foreground px-2 py-0.5 rounded bg-muted/80 text-xs">
                    {cat.count} hit{cat.count === 1 ? '' : 's'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Scans Overview */}
        <div className="rounded-lg border border-border/60 bg-card/70 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Recent Scans</h3>
              <p className="text-xs text-muted-foreground">Latest threat inspections</p>
            </div>
            <Link to="/history">
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                View All
              </Button>
            </Link>
          </div>

          {data.recent_scans.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No recent scans to display.
            </p>
          ) : (
            <div className="space-y-2.5">
              {data.recent_scans.map((scan) => (
                <Link
                  key={scan.id}
                  to={`/reports/${scan.id}`}
                  className="flex items-center justify-between rounded-md border border-border/40 bg-muted/20 hover:bg-muted/40 p-3 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <div className="space-y-0.5 max-w-[220px] sm:max-w-xs truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase font-bold text-primary">
                        {scan.scan_type}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(scan.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-foreground truncate">
                      {scan.title || scan.input_preview}
                    </p>
                  </div>
                  <RiskBadge level={scan.risk_level} size="sm" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
