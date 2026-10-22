import React from 'react'
import {
  BarChart3,
  ShieldAlert,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react'
import { useDashboardSummary } from '@/hooks/useDashboardSummary'
import { StatCard } from '@/components/common/StatCard'
import { RiskDistributionChart } from '@/components/charts/RiskDistributionChart'
import { ScanTrendChart } from '@/components/charts/ScanTrendChart'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { RiskBadge } from '@/components/report/RiskBadge'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const { data, loading, error, refetch } = useDashboardSummary()

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

  const criticalAndHigh =
    (data.by_risk_level.critical || 0) + (data.by_risk_level.high || 0)
  const topIndicator =
    data.top_indicators.length > 0 ? data.top_indicators[0] : null

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
          Aggregate security metrics, detection frequency, and risk distribution.
        </p>
      </div>

      {/* High-level Metric StatCards */}
      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="sr-only">Key Threat Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Scans Executed"
            value={data.total_scans}
            description="Across all channels in session"
            icon={Activity}
          />
          <StatCard
            title="High & Critical Findings"
            value={criticalAndHigh}
            description={`${data.total_scans > 0 ? ((criticalAndHigh / data.total_scans) * 100).toFixed(0) : 0}% of scanned assets`}
            icon={ShieldAlert}
          />
          <StatCard
            title="Most Triggered Clue"
            value={topIndicator ? topIndicator.indicator_id : 'None'}
            description={topIndicator ? `${topIndicator.count} occurrences` : 'No indicators detected'}
            icon={Layers}
          />
          <StatCard
            title="AI Synthesis Engine"
            value="Ready"
            description="Offline heuristics + prompt guard"
            icon={Sparkles}
          />
        </div>
      </section>

      {/* Visual Analytics Grid: Risk Distribution + Activity Trend */}
      <section aria-label="Visual Analytics" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskDistributionChart distribution={data.by_risk_level} />
        <ScanTrendChart data={data.time_series} />
      </section>

      {/* Bottom Grid: Top Triggered Indicators and Recent Scans */}
      <section aria-label="Forensic Breakdown" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Triggered Indicators */}
        <div className="rounded-lg border border-border/60 bg-card/70 p-5 space-y-4">
          <div className="border-b border-border/40 pb-3">
            <h3 className="text-sm font-bold text-foreground">Top Triggered Indicators</h3>
            <p className="text-xs text-muted-foreground">
              Most prevalent lexical and heuristic detections
            </p>
          </div>

          <div className="space-y-3">
            {data.top_indicators.map((ind) => (
              <div
                key={ind.indicator_id}
                className="flex items-center justify-between rounded-md border border-border/40 bg-muted/30 p-3 text-xs"
              >
                <div className="space-y-0.5">
                  <span className="font-mono text-primary font-bold">{ind.indicator_id}</span>
                  <p className="text-muted-foreground text-[11px]">{ind.title}</p>
                </div>
                <span className="font-mono font-bold text-foreground px-2 py-1 rounded bg-muted/70">
                  {ind.count}x
                </span>
              </div>
            ))}
          </div>
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
                      {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-foreground truncate">
                    {scan.display_value}
                  </p>
                </div>
                <RiskBadge level={scan.risk_level} size="sm" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
