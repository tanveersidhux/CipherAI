/**
 * Full Threat Report View Component.
 * Composes:
 * 1. Risk Header (Gauge, Badge, Verdict Label, Defanged Target, Copy Button)
 * 2. Inconclusive / Limited-evidence Notice (when applicable)
 * 3. Disclaimer Banner
 * 4. Evidence / Indicators List
 * 5. Score Contribution Breakdown Table
 * 6. Asynchronous AI Explanation Panel with Skeleton & Retry
 * 7. Metadata Footer
 *
 * CRITICAL SECURITY INVARIANT:
 * Scanned URLs are never rendered as clickable links or auto-opened.
 * Rendered plain text and defanged only.
 */

import React, { useEffect, useState } from 'react'
import { Clock, Cpu, HelpCircle, Layers, RotateCcw } from 'lucide-react'
import type { ThreatReport } from '@/types/threat-report'
import { RiskGauge } from '@/components/report/RiskGauge'
import { RiskBadge } from '@/components/report/RiskBadge'
import { ConfidenceMeter } from '@/components/report/ConfidenceMeter'
import { DefangedUrl } from '@/components/common/DefangedUrl'
import { CopyButton } from '@/components/common/CopyButton'
import { DisclaimerBanner } from '@/components/common/DisclaimerBanner'
import { ScoreBreakdownTable } from '@/components/report/ScoreBreakdownTable'
import { EvidenceList } from '@/components/report/EvidenceList'
import { ExplanationPanel } from '@/components/report/ExplanationPanel'
import { useExplanation } from '@/hooks/useExplanation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PersistenceStatusBanner } from '@/components/common/PersistenceStatusBanner'
import { SaveToCaseDialog } from '@/components/cases/SaveToCaseDialog'
import { getRiskDescription } from '@/lib/risk'
import { ExportMenu } from '@/components/report/ExportMenu'
import { ReputationCard } from '@/components/report/ReputationCard'
import { EmailFindingsCard } from '@/components/report/EmailFindingsCard'

export interface ThreatReportViewProps {
  report: ThreatReport
  onScanAgain?: () => void
  className?: string
}

export function ThreatReportView({
  report: initialReport,
  onScanAgain,
  className = '',
}: ThreatReportViewProps) {
  const [report, setReport] = useState<ThreatReport>(initialReport)
  const [highlightedIndicatorId, setHighlightedIndicatorId] = useState<string | null>(null)
  const explanationHook = useExplanation()

  useEffect(() => {
    setReport(initialReport)
  }, [initialReport])

  // Asynchronously request explanation once report is rendered
  useEffect(() => {
    explanationHook.run(report)
    // Run once on report mount or ID change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.report_id])


  const isInconclusive =
    report.assessment.risk_level === 'inconclusive' ||
    (report.indicators.filter((i) => i.triggered).length < 2 &&
      report.assessment.risk_level === 'low')

  return (
    <article
      className={`space-y-8 max-w-4xl mx-auto py-2 ${className}`}
      aria-labelledby="report-heading"
    >
      {/* Persistence Status Notification */}
      <PersistenceStatusBanner
        status={report.persistence_status}
        scanId={report.scan_id || report.report_id}
        className="no-print"
      />

      {/* Action Toolbar */}
      <div className="flex items-center justify-between no-print">
        {onScanAgain ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onScanAgain}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Scan Another Asset</span>
          </Button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <SaveToCaseDialog scanId={report.scan_id || report.report_id} />
          <ExportMenu
            scanId={report.scan_id || report.report_id}
            targetName={`scan-${(report.scan_id || report.report_id).slice(0, 8)}`}
          />
        </div>
      </div>

      {/* 1. Header (Scan type, defanged display value, timestamp, report ID) */}
      <header className="space-y-3 border-b border-border/40 pb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge
            variant="outline"
            className="font-mono uppercase font-bold text-primary border-primary/30"
          >
            {report.scan_type}
          </Badge>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {new Date(report.created_at).toUTCString()}
          </span>
          <span className="text-muted-foreground ml-auto hidden sm:inline font-mono text-[11px]">
            ID: {report.report_id.slice(0, 8)}...
            <CopyButton
              textToCopy={report.report_id}
              label="Copy Report ID"
              className="h-6 px-1.5 ml-1"
            />
          </span>
        </div>

        <h1
          id="report-heading"
          className="text-xl sm:text-2xl font-bold tracking-tight text-foreground"
        >
          Threat Evaluation Report
        </h1>

        <div className="rounded-lg bg-card/60 border border-border/40 p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Inspected Target:
          </span>
          <div>
            {report.scan_type === 'url' ? (
              <DefangedUrl url={report.input.display_value} />
            ) : (
              <p className="font-sans text-sm text-foreground break-words select-all whitespace-pre-wrap">
                {report.input.display_value}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* 2. Deterministic Risk Assessment Header */}
      <section
        aria-labelledby="risk-summary-heading"
        className="rounded-xl border border-border/60 bg-card/85 p-6 shadow-sm backdrop-blur-md"
      >
        <h2 id="risk-summary-heading" className="sr-only">
          Risk Assessment Summary
        </h2>
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          <RiskGauge
            score={report.assessment.risk_score}
            level={report.assessment.risk_level}
            size={150}
          />

          <div className="space-y-3 flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <RiskBadge level={report.assessment.risk_level} size="lg" />
              <ConfidenceMeter confidence={report.assessment.confidence} />
            </div>

            <p className="text-base font-semibold text-foreground leading-snug">
              {report.assessment.verdict_label || getRiskDescription(report.assessment.risk_level)}
            </p>

            {report.assessment.limitations && report.assessment.limitations.length > 0 && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {report.assessment.limitations[0]}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 3. Gemini Advisory Intelligence Explanation (Hero AI Feature) */}
      <section aria-label="Advisory Intelligence Explanation">
        <ExplanationPanel
          status={explanationHook.status}
          data={explanationHook.data}
          error={explanationHook.error}
          onRetry={explanationHook.retry}
          onSelectIndicator={(id) => setHighlightedIndicatorId(id)}
          knownIndicators={report.indicators}
        />
      </section>

      {/* 4. Inconclusive or Limited Evidence Notice */}
      {isInconclusive && (
        <section
          aria-label="Inconclusive Notice"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300 space-y-1"
        >
          <div className="flex items-center gap-2 font-bold">
            <HelpCircle className="h-4 w-4" />
            <span>Cautionary Note: Inconclusive Assessment</span>
          </div>
          <p className="leading-relaxed">
            Absence of detected malicious indicators does not prove safety or legitimacy.
            Always confirm directly through official communication channels before entering
            credentials or payment information.
          </p>
        </section>
      )}

      {/* Email-specific deep analysis card */}
      <EmailFindingsCard report={report} />

      {/* External threat intelligence feeds */}
      <ReputationCard
        report={report}
        onReputationRefreshed={(updated) => setReport(updated)}
      />

      {/* 5. Mandatory Disclaimer Banner */}
      <section aria-label="Disclaimer">
        <DisclaimerBanner
          customText={
            report.assessment.limitations && report.assessment.limitations.length > 0
              ? report.assessment.limitations[0]
              : undefined
          }
        />
      </section>

      {/* 6. Evidence and Indicators List */}
      <section aria-label="Detailed Evidence">
        <h2 className="text-base font-bold text-foreground mb-4">
          Observable Indicators & Forensic Findings
        </h2>
        <EvidenceList
          indicators={report.indicators}
          highlightedIndicatorId={highlightedIndicatorId}
        />
      </section>

      {/* 7. Score Breakdown Table */}
      <section aria-labelledby="score-breakdown-heading" className="space-y-3">
        <h3 id="score-breakdown-heading" className="text-sm font-semibold tracking-wide uppercase text-foreground">
          Mathematical Score Breakdown
        </h3>
        <ScoreBreakdownTable
          scoreContributions={report.score_breakdown}
          finalRiskScore={report.assessment.risk_score}
        />
      </section>


      {/* 8. Processing Metadata Footer */}
      <footer
        aria-label="Processing Metadata"
        className="rounded-lg border border-border/40 bg-muted/20 p-4 text-xs text-muted-foreground space-y-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            <span>
              Engine: <strong>v{report.engine_version}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>
              Evaluation Duration: <strong>{report.processing.duration_ms}ms</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span>
              Scan Pipeline: <strong className="capitalize">{report.scan_type}</strong>
            </span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/80 pt-2 border-t border-border/20">
          SHA-256 Fingerprint:{' '}
          <span className="font-mono text-[10px] select-all">{report.input.input_hash}</span>
        </p>
      </footer>
    </article>
  )
}
