import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Printer,
  Clock,
  Cpu,
  Layers,
  Sparkles,
  Cog,
} from 'lucide-react'
import { useCipherApi } from '@/lib/api/client'
import type { ThreatReport } from '@/types/threat-report'
import { ApiError } from '@/types/api'
import { RiskGauge } from '@/components/report/RiskGauge'
import { RiskBadge } from '@/components/report/RiskBadge'
import { ConfidenceMeter } from '@/components/report/ConfidenceMeter'
import { DisclaimerBanner } from '@/components/common/DisclaimerBanner'
import { AIExplanationPanel } from '@/components/report/AIExplanationPanel'
import { RecommendedActionsList } from '@/components/report/RecommendedActionsList'
import { IndicatorList } from '@/components/report/IndicatorList'
import { EvidenceTimeline } from '@/components/report/EvidenceTimeline'
import { ScoreBreakdownTable } from '@/components/report/ScoreBreakdownTable'
import { DefangedUrl } from '@/components/common/DefangedUrl'
import { CopyButton } from '@/components/common/CopyButton'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function ReportPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const api = useCipherApi()
  const [report, setReport] = useState<ThreatReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [highlightedIndicatorId, setHighlightedIndicatorId] = useState<string | null>(null)

  useEffect(() => {
    if (!reportId) return
    let isMounted = true
    setLoading(true)
    setError(null)

    api
      .getScan(reportId)
      .then((data) => {
        if (isMounted) {
          setReport(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof ApiError
              ? err
              : new ApiError('NOT_FOUND', 'Threat report not found.')
          )
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [reportId, api])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return <LoadingSkeleton variant="report" className="py-6 max-w-4xl mx-auto" />
  }

  if (error || !report) {
    return (
      <div className="py-12 max-w-md mx-auto">
        <ErrorState error={error} />
        <div className="text-center mt-6">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Homepage
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const {
    input,
    assessment,
    indicators,
    score_breakdown,
    external_evidence,
    ai_explanation,
    recommended_actions,
    engine_version,
    processing,
    created_at,
  } = report

  return (
    <article className="space-y-8 max-w-4xl mx-auto py-2 md:py-6" aria-labelledby="report-heading">
      {/* Navigation and Print Action Toolbar */}
      <div className="flex items-center justify-between no-print">
        <Link to="/history" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Scans</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs gap-1.5 min-h-[36px]"
            title="Print or export report to PDF"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* 1. Header (scan type, display value, timestamp, report ID) */}
      <header className="space-y-3 border-b border-border/40 pb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className="font-mono uppercase font-bold text-primary border-primary/30">
            {report.scan_type}
          </Badge>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {new Date(created_at).toUTCString()}
          </span>
          <span className="text-muted-foreground ml-auto hidden sm:inline font-mono text-[11px]">
            ID: {report.report_id.slice(0, 8)}...
            <CopyButton textToCopy={report.report_id} label="Copy Report ID" className="h-6 px-1.5 ml-1" />
          </span>
        </div>

        <h1 id="report-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Threat Evaluation Report
        </h1>

        <div className="rounded-lg bg-card/60 border border-border/40 p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Inspected Target:
          </span>
          <div>
            {report.scan_type === 'url' ? (
              <DefangedUrl url={input.display_value} />
            ) : (
              <p className="font-sans text-sm text-foreground break-words select-all whitespace-pre-wrap">
                {input.display_value}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* 2. Risk Summary (RiskGauge, RiskBadge, verdict label, confidence) */}
      <section
        aria-labelledby="risk-summary-heading"
        className="rounded-xl border border-border/60 bg-card/85 p-6 shadow-sm backdrop-blur-md"
      >
        <h2 id="risk-summary-heading" className="sr-only">
          Risk Assessment Summary
        </h2>
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          <RiskGauge score={assessment.risk_score} level={assessment.risk_level} size={150} />

          <div className="space-y-3 flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <RiskBadge level={assessment.risk_level} size="lg" />
              <ConfidenceMeter confidence={assessment.confidence} />
            </div>

            <p className="text-base font-semibold text-foreground leading-snug">
              {assessment.verdict_label}
            </p>

            {assessment.limitations && assessment.limitations.length > 0 && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {assessment.limitations[0]}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 3. Limitations and Disclaimer Banner */}
      <section aria-label="Disclaimer">
        <DisclaimerBanner
          customText={
            assessment.limitations && assessment.limitations.length > 0
              ? assessment.limitations[0]
              : undefined
          }
        />
      </section>

      {/* 4. AI Explanation Panel */}
      <section aria-label="Explanation Panel">
        <AIExplanationPanel
          explanation={ai_explanation}
          onSelectIndicator={(id) => setHighlightedIndicatorId(id)}
        />
      </section>

      {/* 5. Recommended Actions */}
      <section aria-label="Action Guidance">
        <RecommendedActionsList actions={recommended_actions} />
      </section>

      {/* 6 & 7. Observable Indicators and Inferred Risk Indicators */}
      <section aria-label="Detailed Indicators">
        <IndicatorList
          indicators={indicators}
          highlightedIndicatorId={highlightedIndicatorId}
        />
      </section>

      {/* 8. External Evidence */}
      <section aria-labelledby="external-evidence-heading" className="space-y-3">
        <h3 id="external-evidence-heading" className="text-sm font-semibold tracking-wide uppercase text-foreground">
          External Evidence & Intelligence Feeds
        </h3>
        <EvidenceTimeline externalEvidence={external_evidence} />
      </section>

      {/* 9. Score Breakdown Table */}
      <section aria-labelledby="score-breakdown-heading" className="space-y-3">
        <h3 id="score-breakdown-heading" className="text-sm font-semibold tracking-wide uppercase text-foreground">
          Mathematical Score Breakdown
        </h3>
        <ScoreBreakdownTable
          scoreContributions={score_breakdown}
          finalRiskScore={assessment.risk_score}
        />
      </section>

      {/* 10. Scan Metadata */}
      <footer
        aria-label="Scan Processing Metadata"
        className="rounded-lg border border-border/40 bg-muted/20 p-4 text-xs text-muted-foreground space-y-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            <span>Engine: <strong>v{engine_version}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Processing Time: <strong>{processing.duration_ms}ms</strong></span>
          </div>

          <div className="flex items-center gap-2">
            {processing.ai_status === 'used' ? (
              <Sparkles className="h-4 w-4 text-primary" />
            ) : (
              <Cog className="h-4 w-4" />
            )}
            <span>AI Status: <strong className="capitalize">{processing.ai_status.replace(/_/g, ' ')}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span>External Lookup: <strong className="capitalize">{processing.external_lookup_status}</strong></span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/80 pt-2 border-t border-border/20">
          SHA-256 Input Digest: <span className="font-mono text-[10px] select-all">{input.input_hash}</span>
        </p>
      </footer>
    </article>
  )
}
