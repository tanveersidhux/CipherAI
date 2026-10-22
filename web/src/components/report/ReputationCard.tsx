import React, { useState } from 'react'
import { Shield, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'
import { ThreatReport } from '../../types/threat-report'

interface ReputationCardProps {
  report: ThreatReport
  onReputationRefreshed?: (updatedReport: ThreatReport) => void
}

export const ReputationCard: React.FC<ReputationCardProps> = ({ report, onReputationRefreshed }) => {
  const [refreshing, setRefreshing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const reputationResults = report.reputation_results || []
  const externalEvidence = report.external_evidence || []

  const handleRefresh = async () => {
    if (!report.scan_id) return
    setRefreshing(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/v1/scans/${report.scan_id}/reputation/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        throw new Error('Failed to refresh threat reputation feeds.')
      }
      const data = await res.json()
      if (onReputationRefreshed && data.updated_report) {
        onReputationRefreshed(data.updated_report)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error contacting threat feeds.')
    } finally {
      setRefreshing(false)
    }
  }

  if (reputationResults.length === 0 && externalEvidence.length === 0) {
    return null
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'match_found':
      case 'flagged':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> Flagged Malicious
          </span>
        )
      case 'no_match':
      case 'not_flagged':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3.5 h-3.5" /> No Threats Listed
          </span>
        )
      case 'rate_limited':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> Rate Limited
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Inconclusive
          </span>
        )
    }
  }

  const formatProviderName = (name: string) => {
    return name
      .replace(/^external_reputation_/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-md p-5 shadow-lg">
      <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">External Threat Intelligence</h3>
            <p className="text-xs text-muted-foreground">
              Cross-checked against Google Safe Browsing, VirusTotal & URLhaus
            </p>
          </div>
        </div>

        {report.scan_id && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground transition-colors disabled:opacity-50"
            title="Re-query threat reputation providers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Feeds'}
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 mb-3 rounded-lg text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {reputationResults.length > 0 ? (
          reputationResults.map((res, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg border border-border/50 bg-background/50 flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  {formatProviderName(res.provider)}
                </span>
                {getStatusBadge(res.status)}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{res.summary}</p>
              {res.categories && res.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {res.categories.map((c, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          externalEvidence.map((ev, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg border border-border/50 bg-background/50 flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  {formatProviderName(ev.source)}
                </span>
                {getStatusBadge(ev.status)}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{ev.note || ev.detail}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
