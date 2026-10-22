import React from 'react'
import { Globe, ShieldCheck, AlertCircle, Clock } from 'lucide-react'
import type { ExternalEvidence } from '@/types/threat-report'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface EvidenceTimelineProps {
  externalEvidence: ExternalEvidence[]
  className?: string
}

export function EvidenceTimeline({
  externalEvidence,
  className,
}: EvidenceTimelineProps) {
  if (externalEvidence.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border border-dashed border-border/70 p-6 text-center bg-card/40',
          className
        )}
      >
        <Globe className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" aria-hidden="true" />
        <h4 className="text-sm font-semibold text-foreground mb-1">
          External Evidence Not Available
        </h4>
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          Third-party reputation feeds and live blocklist queries are not enabled in this offline lexical version.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {externalEvidence.map((ev, index) => {
        const isFlagged = ev.status === 'flagged'
        return (
          <div
            key={index}
            className="flex items-start gap-4 rounded-lg border border-border/50 bg-card/60 p-4"
          >
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                isFlagged ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
              )}
            >
              {isFlagged ? (
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
              ) : (
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">{ev.source}</span>
                <Badge
                  variant="outline"
                  className={isFlagged ? 'border-destructive text-destructive' : 'text-muted-foreground'}
                >
                  {ev.status.replace(/_/g, ' ')}
                </Badge>
              </div>

              {ev.detail && (
                <p className="text-xs text-foreground font-mono">{ev.detail}</p>
              )}

              <p className="text-xs text-muted-foreground italic">{ev.note}</p>

              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                <Clock className="h-3 w-3" />
                <span>Checked at {new Date(ev.checked_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
