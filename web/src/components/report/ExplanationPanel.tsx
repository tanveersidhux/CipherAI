/**
 * Asynchronous Explanation Panel Component.
 * Supports loading skeleton, live AI explanation, deterministic fallback, and failure retry states.
 *
 * CRITICAL SECURITY INVARIANT:
 * All backend and AI text is rendered strictly as plain escaped text.
 * Never uses dangerouslySetInnerHTML or markdown-to-HTML without sanitization.
 */

import React from 'react'
import {
  Sparkles,
  Cog,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react'
import type { ExplanationResponse } from '@/types/explanation'
import type { Indicator } from '@/types/threat-report'
import type { ApiError } from '@/lib/api/errors'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CopyButton } from '@/components/common/CopyButton'
import { cn } from '@/lib/utils'

export interface ExplanationPanelProps {
  status: 'idle' | 'loading' | 'success' | 'error'
  data: ExplanationResponse | null
  error: ApiError | null
  onRetry?: () => void
  onSelectIndicator?: (indicatorId: string) => void
  knownIndicators?: Indicator[]
  className?: string
}

export function ExplanationPanel({
  status,
  data,
  error,
  onRetry,
  onSelectIndicator,
  knownIndicators = [],
  className,
}: ExplanationPanelProps) {
  // Set of verified indicator IDs to reject broken foreign references defensively
  const validIndicatorIds = new Set(knownIndicators.map((i) => i.indicator_id))

  const handleIndicatorClick = (id: string) => {
    if (!validIndicatorIds.has(id)) return
    if (onSelectIndicator) {
      onSelectIndicator(id)
    }
    const targetEl = document.getElementById(`indicator-${id}`)
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const trigger = targetEl.querySelector('button')
      if (trigger) trigger.focus()
    }
  }

  // 1. Loading Skeleton State
  if (status === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={cn(
          'rounded-lg border border-border/60 bg-card/80 p-5 md:p-6 space-y-4 shadow-sm',
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold text-foreground">
              Generating Threat Explanation...
            </span>
          </div>
          <Skeleton className="h-5 w-32" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>

        <div className="pt-2 space-y-2">
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
        </div>
      </div>
    )
  }

  // 2. Error State with Retry Button
  if (status === 'error') {
    return (
      <div
        role="alert"
        aria-live="polite"
        className={cn(
          'rounded-lg border border-border/60 bg-card/80 p-5 space-y-3 shadow-sm',
          className
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Explanation Currently Unavailable
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {error?.message || 'Could not retrieve AI intelligence explanation. The core deterministic evaluation report is unaffected.'}
              </p>
            </div>
          </div>

          {onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="gap-1.5 text-xs shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (!data) return null

  const { explanation, meta } = data
  const isAI = meta.explanation_source === 'ai'

  return (
    <div
      className={cn(
        'rounded-lg border bg-card/85 p-5 md:p-6 space-y-5 shadow-sm transition-colors backdrop-blur-xs',
        isAI
          ? 'border-primary/30 ring-1 ring-primary/10'
          : 'border-border/60',
        className
      )}
      aria-labelledby="explanation-panel-title"
    >
      {/* Header Attribution & Provenance Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          {isAI ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary shadow-xs ring-1 ring-primary/25">
              <Sparkles className="h-4 w-4 animate-pulse" aria-hidden="true" />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Cog className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 id="explanation-panel-title" className="text-sm font-bold text-foreground">
                {isAI ? 'AI Threat Intelligence Analysis' : 'Standard Security Explanation'}
              </h3>
              {isAI && (
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-3 w-3" />
                  Grounded
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
              <span>
                {isAI
                  ? `Google Gemini Engine (${meta.model || 'gemini-3.5-flash'})`
                  : 'Deterministic findings template'}
              </span>
              {meta.latency_ms > 0 && (
                <span className="inline-flex items-center gap-0.5 text-primary/80 font-mono">
                  <Zap className="h-3 w-3" />
                  {(meta.latency_ms / 1000).toFixed(2)}s
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Provenance & Confidence Badges */}
        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          {explanation.confidence && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] font-semibold capitalize',
                explanation.confidence === 'high'
                  ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                  : explanation.confidence === 'medium'
                  ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                  : 'border-slate-500/30 text-slate-600 dark:text-slate-400'
              )}
            >
              {explanation.confidence} Confidence
            </Badge>
          )}

          <Badge
            variant={isAI ? 'default' : 'secondary'}
            className="text-[10px] font-semibold shrink-0 gap-1"
          >
            {isAI ? (
              <>
                <Sparkles className="h-3 w-3" />
                <span>AI-generated explanation</span>
              </>
            ) : (
              'Standard explanation (AI unavailable)'
            )}
          </Badge>
        </div>
      </div>

      {/* Prompt Injection Suspected Security Banner */}
      {meta.prompt_injection_suspected && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Prompt Injection Suspected: </strong>
            Untrusted scanned content contained manipulative instruction phrases. Content was strictly evaluated as data.
          </span>
        </div>
      )}

      {/* Plain Language Summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Plain-Language Executive Summary
          </span>
          <CopyButton
            textToCopy={explanation.summary}
            label="Copy Summary"
            className="h-6 px-2 text-[10px] gap-1"
          />
        </div>
        <p className="text-sm text-foreground leading-relaxed font-sans font-medium whitespace-pre-wrap rounded-md bg-muted/20 border border-border/30 p-3.5">
          {explanation.summary}
        </p>
      </div>

      {/* Risk Statement */}
      {explanation.risk_statement && (
        <div className="rounded-md border border-border/40 bg-muted/20 p-3 text-xs text-foreground leading-relaxed">
          <strong className="text-foreground">Risk Assessment: </strong>
          <span>{explanation.risk_statement}</span>
        </div>
      )}

      {/* Key Findings with Cited Evidence IDs */}
      {explanation.key_findings && explanation.key_findings.length > 0 && (
        <div className="space-y-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Key Findings & Evidence Citations
          </span>
          <div className="space-y-2">
            {explanation.key_findings.map((finding, idx) => (
              <div
                key={idx}
                className="rounded-md border border-border/40 bg-muted/30 p-3 text-xs space-y-2"
              >
                <h4 className="font-semibold text-foreground">{finding.title}</h4>
                <p className="text-muted-foreground leading-relaxed">{finding.detail}</p>
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    Citations:
                  </span>
                  {finding.evidence_ids.map((id) => {
                    const isKnown = validIndicatorIds.has(id)
                    if (!isKnown) {
                      return (
                        <span
                          key={id}
                          className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted"
                        >
                          #{id}
                        </span>
                      )
                    }
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleIndicatorClick(id)}
                        className="inline-flex items-center rounded bg-primary/10 hover:bg-primary/20 text-primary font-mono text-[10px] font-bold px-2 py-0.5 border border-primary/20 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        title={`Jump to indicator ${id}`}
                        aria-label={`Jump to cited evidence ${id}`}
                      >
                        #{id}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Actions Ordered by Priority */}
      {explanation.recommended_actions && explanation.recommended_actions.length > 0 && (
        <div className="space-y-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recommended Defensive Actions
          </span>
          <div className="space-y-2">
            {explanation.recommended_actions.map((act, idx) => {
              const priorityClass =
                act.priority === 'high'
                  ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                  : act.priority === 'medium'
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'

              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-md border border-border/40 bg-card p-3 text-xs"
                >
                  <span
                    className={cn(
                      'uppercase text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5',
                      priorityClass
                    )}
                  >
                    {act.priority}
                  </span>
                  <p className="text-foreground leading-relaxed flex-1">{act.action}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Limitations - Always Visible */}
      {explanation.limitations && explanation.limitations.length > 0 && (
        <div className="space-y-1.5 border-t border-border/30 pt-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Analysis Limitations & Uncertainty
          </span>
          <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
            {explanation.limitations.map((lim, idx) => (
              <li key={idx} className="leading-relaxed">
                {lim}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Legal & Operational Disclaimer - Always Visible */}
      {explanation.disclaimer && (
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground/90 border-t border-border/30 pt-3">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            <strong>Disclaimer: </strong>
            {explanation.disclaimer}
          </p>
        </div>
      )}
    </div>
  )
}
