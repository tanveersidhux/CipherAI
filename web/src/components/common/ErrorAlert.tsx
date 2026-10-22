/**
 * Reusable Error Alert Component for ApiError display.
 * Renders friendly user messages, optional field details, support trace ID, and retry actions.
 * Never leaks server stack traces, database logs, or unescaped HTML.
 */

import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ApiError } from '@/lib/api/errors'
import { cn } from '@/lib/utils'

export interface ErrorAlertProps {
  error: ApiError | null
  onRetry?: () => void
  className?: string
}

export function ErrorAlert({ error, onRetry, className }: ErrorAlertProps) {
  if (!error) return null

  const isRateLimited = error.code === 'RATE_LIMITED'
  const retryAfter = error.retryAfterSeconds

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground space-y-3',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1 flex-1">
          <h4 className="font-semibold text-destructive leading-tight">
            {error.code.replace(/_/g, ' ')}
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {error.message}
            {isRateLimited && retryAfter && (
              <span className="block mt-1 text-xs font-mono text-muted-foreground">
                Please wait {retryAfter}s before retrying.
              </span>
            )}
          </p>

          {/* Field-level error list */}
          {error.details && error.details.length > 0 && (
            <ul className="list-disc list-inside space-y-0.5 pt-1 text-xs text-destructive/90">
              {error.details.map((d, idx) => (
                <li key={idx}>
                  {d.field ? <strong className="font-mono">{d.field}: </strong> : null}
                  <span>{d.issue}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Trace Request ID for diagnostics */}
          {error.request_id && (
            <p className="text-[11px] font-mono text-muted-foreground/70 pt-1">
              Trace ID: <span className="select-all">{error.request_id}</span>
            </p>
          )}
        </div>

        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="shrink-0 gap-1.5 text-xs border-destructive/30 hover:bg-destructive/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </Button>
        )}
      </div>
    </div>
  )
}
