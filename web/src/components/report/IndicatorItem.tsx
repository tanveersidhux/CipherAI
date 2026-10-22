import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Indicator } from '@/types/threat-report'
import { SeverityBadge } from './SeverityBadge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

export interface IndicatorItemProps {
  indicator: Indicator
  isHighlighted?: boolean
  className?: string
}

export function IndicatorItem({
  indicator,
  isHighlighted = false,
  className,
}: IndicatorItemProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      id={`indicator-${indicator.indicator_id}`}
      className={cn(
        'rounded-lg border border-border/60 bg-card/70 transition-all scroll-mt-24',
        isHighlighted
          ? 'ring-2 ring-primary ring-offset-2 bg-primary/5 border-primary/50 shadow-md'
          : 'hover:border-border',
        className
      )}
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between p-4 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg min-h-[44px]"
          aria-expanded={isOpen}
          aria-controls={`content-${indicator.indicator_id}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 mr-2">
            <span className="font-mono text-xs font-bold text-primary tracking-wider uppercase">
              {indicator.indicator_id}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {indicator.title}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SeverityBadge severity={indicator.severity} />
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent id={`content-${indicator.indicator_id}`} className="px-4 pb-4 pt-1 border-t border-border/30 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {indicator.description}
        </p>

        {indicator.observed_value !== null && (
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Observed Value:
            </span>
            <div className="rounded bg-muted/60 px-3 py-2 font-mono text-xs text-foreground break-all border border-border/30 select-all">
              {indicator.observed_value}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
          <span>
            Category: <strong className="text-foreground">{indicator.category.replace(/_/g, ' ')}</strong>
          </span>
          <span>
            Evidence Kind: <strong className="text-foreground">{indicator.evidence_kind}</strong>
          </span>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
