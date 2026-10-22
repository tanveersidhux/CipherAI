import React from 'react'
import { Eye, Brain, Globe2 } from 'lucide-react'
import type { Indicator } from '@/types/threat-report'
import { IndicatorItem } from './IndicatorItem'
import { EmptyState } from '@/components/common/EmptyState'
import { EMPTY_STATES } from '@/lib/content/wording'
import { cn } from '@/lib/utils'

export interface IndicatorListProps {
  indicators: Indicator[]
  highlightedIndicatorId?: string | null
  className?: string
}

export function IndicatorList({
  indicators,
  highlightedIndicatorId,
  className,
}: IndicatorListProps) {
  const observed = indicators.filter((i) => i.evidence_kind === 'observed')
  const inferred = indicators.filter((i) => i.evidence_kind === 'inferred')
  const external = indicators.filter((i) => i.evidence_kind === 'external')

  if (indicators.length === 0) {
    return (
      <EmptyState
        title={EMPTY_STATES.indicators.title}
        description={EMPTY_STATES.indicators.description}
        className={className}
      />
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Observable Indicators Group */}
      {observed.length > 0 && (
        <section aria-labelledby="heading-observed-indicators" className="space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 id="heading-observed-indicators" className="text-sm font-semibold tracking-wide uppercase text-foreground">
              Observable Indicators ({observed.length})
            </h3>
            <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">
              Deterministic, verifiable facts
            </span>
          </div>
          <div className="space-y-2.5">
            {observed.map((ind) => (
              <IndicatorItem
                key={ind.indicator_id}
                indicator={ind}
                isHighlighted={highlightedIndicatorId === ind.indicator_id}
              />
            ))}
          </div>
        </section>
      )}

      {/* Inferred Risk Heuristics Group */}
      {inferred.length > 0 && (
        <section aria-labelledby="heading-inferred-indicators" className="space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <h3 id="heading-inferred-indicators" className="text-sm font-semibold tracking-wide uppercase text-foreground">
              Inferred Risk Heuristics ({inferred.length})
            </h3>
            <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">
              Pattern & behavioral suspicion
            </span>
          </div>
          <div className="space-y-2.5">
            {inferred.map((ind) => (
              <IndicatorItem
                key={ind.indicator_id}
                indicator={ind}
                isHighlighted={highlightedIndicatorId === ind.indicator_id}
              />
            ))}
          </div>
        </section>
      )}

      {/* External Evidence Group */}
      {external.length > 0 && (
        <section aria-labelledby="heading-external-indicators" className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-cyan-500" aria-hidden="true" />
            <h3 id="heading-external-indicators" className="text-sm font-semibold tracking-wide uppercase text-foreground">
              External Indicators ({external.length})
            </h3>
          </div>
          <div className="space-y-2.5">
            {external.map((ind) => (
              <IndicatorItem
                key={ind.indicator_id}
                indicator={ind}
                isHighlighted={highlightedIndicatorId === ind.indicator_id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
