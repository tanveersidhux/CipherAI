import React from 'react'
import { Mail, Paperclip, ExternalLink, AlertTriangle, CheckCircle, XCircle, FileCode } from 'lucide-react'
import { ThreatReport } from '../../types/threat-report'

interface EmailFindingsCardProps {
  report: ThreatReport
}

export const EmailFindingsCard: React.FC<EmailFindingsCardProps> = ({ report }) => {
  const summary = report.email_summary
  const extractedUrls = report.extracted_urls || []
  const attachments = report.attachments || []

  if (!summary && extractedUrls.length === 0 && attachments.length === 0) {
    return null
  }

  const auth = summary?.reported_authentication || {}

  const getAuthBadge = (val: string | undefined) => {
    switch (val) {
      case 'pass':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
            <CheckCircle className="w-3 h-3" /> PASS
          </span>
        )
      case 'fail':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400">
            <XCircle className="w-3 h-3" /> FAIL
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
            <AlertTriangle className="w-3 h-3" /> {val || 'UNKNOWN'}
          </span>
        )
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-md p-5 shadow-lg space-y-4">
      <div className="flex items-center gap-2.5 border-b border-border/40 pb-3">
        <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Email Inspection Details</h3>
          <p className="text-xs text-muted-foreground">MIME structure, reported authentication, and nested payload analysis</p>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-background/50 p-3.5 rounded-lg border border-border/40">
          <div>
            <span className="text-muted-foreground">From:</span>{' '}
            <span className="font-mono text-foreground font-semibold break-all">{summary.from || '—'}</span>
          </div>
          {summary.reply_to && (
            <div>
              <span className="text-muted-foreground">Reply-To:</span>{' '}
              <span className="font-mono text-amber-300 font-semibold break-all">{summary.reply_to}</span>
            </div>
          )}
          <div className="md:col-span-2">
            <span className="text-muted-foreground">Subject:</span>{' '}
            <span className="text-foreground font-medium">{summary.subject || '—'}</span>
          </div>
          <div className="md:col-span-2 pt-2 border-t border-border/30 flex flex-wrap items-center gap-4">
            <span className="text-muted-foreground text-[11px]">Reported Header Auth:</span>
            <span className="text-xs">SPF: {getAuthBadge(auth.spf)}</span>
            <span className="text-xs">DKIM: {getAuthBadge(auth.dkim)}</span>
            <span className="text-xs">DMARC: {getAuthBadge(auth.dmarc)}</span>
            <span className="text-[10px] text-muted-foreground italic">(values from headers, unverified)</span>
          </div>
        </div>
      )}

      {attachments.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5 text-primary" /> Attachments ({attachments.length})
          </h4>
          <div className="space-y-2">
            {attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/40 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileCode className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="truncate">
                    <p className="font-medium text-foreground truncate">{att.filename}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {(att.size_bytes / 1024).toFixed(1)} KB • SHA-256: {att.sha256.slice(0, 16)}...
                    </p>
                  </div>
                </div>
                {(att.risky_extension || att.is_executable) && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                    High Risk Executable
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {extractedUrls.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-primary" /> Extracted Links ({extractedUrls.length})
          </h4>
          <div className="space-y-1.5">
            {extractedUrls.map((u, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-background/30 text-xs gap-3"
              >
                <span className="font-mono text-muted-foreground truncate max-w-[70%]">{u.url}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.risk_score >= 60
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : u.risk_score >= 30
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    Risk Score: {u.risk_score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
