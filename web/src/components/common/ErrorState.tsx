import React from 'react'
import {
  AlertCircle,
  Clock,
  WifiOff,
  ShieldAlert,
  FileQuestion,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiError, type ErrorCode } from '@/types/api'
import { ERROR_MESSAGES } from '@/lib/content/wording'
import { cn } from '@/lib/utils'

export interface ErrorStateProps {
  error: ApiError | Error | null
  onRetry?: () => void
  className?: string
}

export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  if (!error) return null

  const apiErr = error instanceof ApiError ? error : null
  const code: ErrorCode = apiErr?.code ?? 'INTERNAL_ERROR'
  const friendlyMessage =
    ERROR_MESSAGES[code] || apiErr?.message || error.message || 'An unexpected error occurred.'
  const requestId = apiErr?.request_id

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center max-w-lg mx-auto',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3">
        {code === 'RATE_LIMITED' ? (
          <Clock className="h-6 w-6" aria-hidden="true" />
        ) : code === 'DEPENDENCY_UNAVAILABLE' ? (
          <WifiOff className="h-6 w-6" aria-hidden="true" />
        ) : code === 'NOT_FOUND' ? (
          <FileQuestion className="h-6 w-6" aria-hidden="true" />
        ) : code === 'UNAUTHENTICATED' || code === 'FORBIDDEN' ? (
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        ) : (
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        )}
      </div>

      <h3 className="text-base font-semibold text-foreground mb-1">
        {code.replace(/_/g, ' ')}
      </h3>

      <p className="text-sm text-muted-foreground mb-4 leading-relaxed max-w-md">
        {friendlyMessage}
      </p>

      {apiErr?.details && apiErr.details.length > 0 && (
        <ul className="mb-4 text-xs text-destructive text-left space-y-1 list-disc list-inside bg-background/50 p-3 rounded border border-border/40 w-full">
          {apiErr.details.map((d, i) => (
            <li key={i}>
              {d.field ? <strong className="font-mono">{d.field}: </strong> : null}
              {d.issue}
            </li>
          ))}
        </ul>
      )}

      {requestId && (
        <span className="text-[11px] text-muted-foreground font-mono mb-4">
          Trace ID: {requestId}
        </span>
      )}

      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  )
}
