import React from 'react'
import { ShieldCheck } from 'lucide-react'
import type { RecommendedAction } from '@/types/threat-report'
import { cn } from '@/lib/utils'

export interface RecommendedActionsListProps {
  actions: RecommendedAction[]
  className?: string
}

export function RecommendedActionsList({
  actions,
  className,
}: RecommendedActionsListProps) {
  if (actions.length === 0) return null

  // Sort by priority ascending (1 = highest urgency)
  const sorted = [...actions].sort((a, b) => a.priority - b.priority)

  return (
    <div className={cn('space-y-3', className)} aria-labelledby="recommended-actions-heading">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 id="recommended-actions-heading" className="text-sm font-semibold tracking-wide uppercase text-foreground">
          Recommended Defensive Actions
        </h3>
      </div>

      <ol className="space-y-2 list-none p-0 m-0">
        {sorted.map((act) => (
          <li
            key={act.action_id}
            className="flex items-start gap-3 rounded-lg border border-border/50 bg-card/60 p-3.5 text-xs text-foreground leading-relaxed"
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px]"
              aria-label={`Priority ${act.priority}`}
            >
              {act.priority}
            </span>
            <div className="flex-1">
              <span className="font-medium text-foreground">{act.text}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
