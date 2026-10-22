import React from 'react'
import { Sparkles, Cog, Compass, AlertCircle } from 'lucide-react'
import type { AIExplanation } from '@/types/threat-report'
import { Badge } from '@/components/ui/badge'
import { AI_LABELS } from '@/lib/content/wording'
import { cn } from '@/lib/utils'

export interface AIExplanationPanelProps {
  explanation: AIExplanation
  onSelectIndicator?: (indicatorId: string) => void
  className?: string
}

export function AIExplanationPanel({
  explanation,
  onSelectIndicator,
  className,
}: AIExplanationPanelProps) {
  const isLLM = explanation.generated_by === 'llm'

  const handleChipClick = (indicatorId: string) => {
    if (onSelectIndicator) {
      onSelectIndicator(indicatorId)
    }
    const targetEl = document.getElementById(`indicator-${indicatorId}`)
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const triggerBtn = targetEl.querySelector('button')
      if (triggerBtn) {
        triggerBtn.focus()
      }
    }
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-card/80 p-5 md:p-6 space-y-5 shadow-xs transition-colors',
        isLLM
          ? 'border-primary/30 ring-1 ring-primary/10'
          : 'border-border/60',
        className
      )}
      aria-labelledby="ai-panel-title"
    >
      {/* Header Attribution Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          {isLLM ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Cog className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
          <div>
            <h3 id="ai-panel-title" className="text-sm font-bold text-foreground">
              {isLLM ? AI_LABELS.llmBadge : AI_LABELS.fallbackBadge}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {isLLM ? AI_LABELS.llmSubtitle : AI_LABELS.fallbackSubtitle}
            </p>
          </div>
        </div>

        <Badge variant={isLLM ? 'default' : 'secondary'} className="text-[10px] uppercase font-semibold shrink-0">
          {isLLM ? 'AI-Generated' : 'Deterministic Summary'}
        </Badge>
      </div>

      {/* Plain Language Summary */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Executive Summary
        </span>
        <p className="text-sm text-foreground leading-relaxed font-sans font-medium">
          {explanation.summary}
        </p>
      </div>

      {/* Key Findings with Cited Indicator Chips */}
      {explanation.key_findings.length > 0 && (
        <div className="space-y-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Key Findings & Indicator Citations
          </span>
          <div className="space-y-2">
            {explanation.key_findings.map((finding, idx) => (
              <div
                key={idx}
                className="rounded-md border border-border/40 bg-muted/30 p-3 text-xs space-y-2"
              >
                <p className="text-foreground leading-relaxed">{finding.text}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    Cited:
                  </span>
                  {finding.indicator_ids.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleChipClick(id)}
                      className="inline-flex items-center rounded bg-primary/10 hover:bg-primary/20 text-primary font-mono text-[10px] font-bold px-2 py-0.5 border border-primary/20 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title={`Scroll to indicator ${id}`}
                      aria-label={`Jump to cited indicator ${id}`}
                    >
                      #{id}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable User Guidance */}
      {explanation.user_guidance && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Compass className="h-4 w-4" aria-hidden="true" />
            <span>Recommended User Guidance</span>
          </div>
          <p className="text-xs text-foreground leading-relaxed pl-5">
            {explanation.user_guidance}
          </p>
        </div>
      )}

      {/* Uncertainty & Limitations Disclosure */}
      {explanation.uncertainty_notes && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground border-t border-border/30 pt-3">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed">
            <strong className="font-semibold text-foreground">Disclosures: </strong>
            {explanation.uncertainty_notes}
          </p>
        </div>
      )}
    </div>
  )
}
