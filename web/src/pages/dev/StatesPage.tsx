import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FlaskConical,
} from 'lucide-react'
import { RiskBadge } from '@/components/report/RiskBadge'
import { RiskGauge } from '@/components/report/RiskGauge'
import { ConfidenceMeter } from '@/components/report/ConfidenceMeter'
import { DisclaimerBanner } from '@/components/common/DisclaimerBanner'
import { AIExplanationPanel } from '@/components/report/AIExplanationPanel'
import { RecommendedActionsList } from '@/components/report/RecommendedActionsList'
import { IndicatorList } from '@/components/report/IndicatorList'
import { EvidenceTimeline } from '@/components/report/EvidenceTimeline'
import { ScoreBreakdownTable } from '@/components/report/ScoreBreakdownTable'
import { DefangedUrl } from '@/components/common/DefangedUrl'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { ApiError } from '@/types/api'
import {
  criticalReportFixture,
  highReportFixture,
  mediumReportFixture,
  lowReportFixture,
  inconclusiveReportFixture,
  fallbackAiReportFixture,
  adversarialReportFixture,
} from '@/lib/api/mocks/fixtures'
import { Button } from '@/components/ui/button'

export default function StatesPage() {
  const [selectedFixtureKey, setSelectedFixtureKey] = useState<string>('critical')
  const [activeTab, setActiveTab] = useState<'fixtures' | 'errors' | 'skeletons' | 'empty'>('fixtures')

  const fixturesMap: Record<string, typeof criticalReportFixture> = {
    critical: criticalReportFixture,
    high: highReportFixture,
    medium: mediumReportFixture,
    low: lowReportFixture,
    inconclusive: inconclusiveReportFixture,
    fallback: fallbackAiReportFixture,
    adversarial: adversarialReportFixture,
  }

  const currentReport = fixturesMap[selectedFixtureKey] || criticalReportFixture

  return (
    <div className="space-y-8 py-2 md:py-6">
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-500">
          <FlaskConical className="h-5 w-5" />
          <span className="font-bold text-sm">Development State Previewer</span>
        </div>
        <span className="text-xs text-amber-500/80 font-mono">
          Exempt from production bundles (import.meta.env.DEV only)
        </span>
      </div>

      {/* Mode Navigation */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        {(['fixtures', 'errors', 'skeletons', 'empty'] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab)}
            className="capitalize text-xs"
          >
            {tab}
          </Button>
        ))}
      </div>

      {activeTab === 'fixtures' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {Object.keys(fixturesMap).map((key) => (
              <Button
                key={key}
                variant={selectedFixtureKey === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFixtureKey(key)}
                className="capitalize text-xs font-mono"
              >
                {key} ({fixturesMap[key].assessment.risk_level})
              </Button>
            ))}
          </div>

          <div className="space-y-6 border border-border/40 p-6 rounded-xl bg-card/60">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                Previewing: <span className="text-primary uppercase font-mono">{selectedFixtureKey}</span>
              </h2>
              <Link to={`/reports/${currentReport.report_id}`}>
                <Button variant="outline" size="sm" className="text-xs">
                  Open Full Report Page
                </Button>
              </Link>
            </div>

            <div className="p-4 rounded-lg bg-muted/40">
              <DefangedUrl url={currentReport.input.display_value} />
            </div>

            <div className="flex items-center gap-6">
              <RiskGauge
                score={currentReport.assessment.risk_score}
                level={currentReport.assessment.risk_level}
              />
              <div className="space-y-2">
                <RiskBadge level={currentReport.assessment.risk_level} size="lg" />
                <ConfidenceMeter confidence={currentReport.assessment.confidence} />
                <p className="text-sm font-semibold">{currentReport.assessment.verdict_label}</p>
              </div>
            </div>

            {currentReport.assessment.limitations.length > 0 && (
              <DisclaimerBanner customText={currentReport.assessment.limitations[0]} />
            )}

            <AIExplanationPanel explanation={currentReport.ai_explanation} />

            <RecommendedActionsList actions={currentReport.recommended_actions} />

            <IndicatorList indicators={currentReport.indicators} />

            <ScoreBreakdownTable
              scoreContributions={currentReport.score_breakdown}
              finalRiskScore={currentReport.assessment.risk_score}
            />

            <EvidenceTimeline externalEvidence={currentReport.external_evidence} />
          </div>
        </div>
      )}

      {activeTab === 'errors' && (
        <div className="space-y-6">
          <h2 className="text-base font-bold">Error Envelope Renderings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ErrorState
              error={
                new ApiError(
                  'RATE_LIMITED',
                  'Scan frequency exceeded. Please retry in 30 seconds.',
                  [],
                  'req_dev_rate_trace',
                  429
                )
              }
            />
            <ErrorState
              error={
                new ApiError(
                  'DEPENDENCY_UNAVAILABLE',
                  'The threat analysis service is currently down for maintenance.',
                  [],
                  'req_dev_unavail_trace',
                  503
                )
              }
            />
            <ErrorState
              error={
                new ApiError(
                  'INVALID_URL',
                  'Submitted string violates RFC 3986 syntax rules.',
                  [{ field: 'url', issue: 'Expected scheme and authority host.' }],
                  'req_dev_invalid_trace',
                  422
                )
              }
            />
            <ErrorState
              error={
                new ApiError(
                  'NOT_FOUND',
                  'Threat report could not be found.',
                  [],
                  'req_dev_404_trace',
                  404
                )
              }
            />
          </div>
        </div>
      )}

      {activeTab === 'skeletons' && (
        <div className="space-y-8">
          <h2 className="text-base font-bold">Loading Skeletons</h2>
          <div className="p-4 border rounded-lg bg-card/40">
            <h3 className="text-sm font-bold mb-4">Report Skeleton</h3>
            <LoadingSkeleton variant="report" />
          </div>
          <div className="p-4 border rounded-lg bg-card/40">
            <h3 className="text-sm font-bold mb-4">Table Skeleton</h3>
            <LoadingSkeleton variant="table" />
          </div>
          <div className="p-4 border rounded-lg bg-card/40">
            <h3 className="text-sm font-bold mb-4">Dashboard Skeleton</h3>
            <LoadingSkeleton variant="dashboard" />
          </div>
        </div>
      )}

      {activeTab === 'empty' && (
        <div className="space-y-6">
          <h2 className="text-base font-bold">Empty States</h2>
          <EmptyState
            title="No Recent Threat Scans"
            description="Your search criteria did not match any historical scans recorded in this session."
            actionLabel="Reset Search Filters"
            onAction={() => {}}
          />
        </div>
      )}
    </div>
  )
}
