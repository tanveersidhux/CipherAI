import React, { useEffect, useState, useCallback } from 'react'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Database,
  Sparkles,
  Server,
  AlertTriangle,
} from 'lucide-react'
import { getHealth, type HealthResult, type HealthData } from '@/lib/api/health'
import { isUsingDevFallback, getApiBaseUrl } from '@/lib/config'
import { CONNECTION_STATUS_LABELS } from '@/lib/content/wording'
import { Button } from '@/components/ui/button'

export interface ConnectionStatusProps {
  className?: string
  initialCheck?: boolean
}

export function ConnectionStatus({ className = '', initialCheck = true }: ConnectionStatusProps): React.JSX.Element {
  const [checking, setChecking] = useState<boolean>(initialCheck)
  const [result, setResult] = useState<HealthResult | null>(null)
  const usingFallback = isUsingDevFallback()
  const apiUrl = getApiBaseUrl()

  useEffect(() => {
    if (!initialCheck) return
    let ignore = false
    getHealth().then((res) => {
      if (!ignore) {
        setResult(res)
        setChecking(false)
      }
    })
    return () => {
      ignore = true
    }
  }, [initialCheck])

  const runCheck = useCallback(async () => {
    setChecking(true)
    try {
      const res = await getHealth()
      setResult(res)
    } finally {
      setChecking(false)
    }
  }, [])

  // Map database status to friendly neutral label
  function getDbLabel(data: HealthData): string {
    switch (data.dependencies.database) {
      case 'ok':
        return CONNECTION_STATUS_LABELS.dbOk
      case 'unavailable':
        return CONNECTION_STATUS_LABELS.dbUnavailable
      case 'not_configured':
      default:
        return CONNECTION_STATUS_LABELS.dbNotConfigured
    }
  }

  // Map LLM status to friendly neutral label
  function getLlmLabel(data: HealthData): string {
    switch (data.dependencies.llm) {
      case 'enabled':
        return CONNECTION_STATUS_LABELS.llmEnabled
      case 'disabled':
        return CONNECTION_STATUS_LABELS.llmDisabled
      case 'not_configured':
      default:
        return CONNECTION_STATUS_LABELS.llmNotConfigured
    }
  }

  return (
    <div
      className={`rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm ${className}`}
      aria-live="polite"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-base font-semibold tracking-tight">API Backend Connectivity</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Target Endpoint: <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{apiUrl || 'Not configured'}</code>
          </p>
        </div>

        {/* Action Button: Minimum 44px touch target */}
        <Button
          variant="outline"
          size="sm"
          onClick={runCheck}
          disabled={checking}
          className="min-h-[44px] min-w-[44px] gap-2 self-start sm:self-auto"
          aria-label={CONNECTION_STATUS_LABELS.retry}
        >
          <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>{CONNECTION_STATUS_LABELS.retry}</span>
        </Button>
      </div>

      {/* Connectivity Status Badge & Details */}
      <div className="mt-4 border-t border-border/60 pt-4">
        {checking ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            <span>{CONNECTION_STATUS_LABELS.checking}</span>
          </div>
        ) : result?.ok ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-500 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{CONNECTION_STATUS_LABELS.backendReachable}</span>
              <span className="text-xs font-normal text-muted-foreground">
                (v{result.data.app_version} &bull; {result.data.environment})
              </span>
            </div>

            {/* Subsystem Dependencies Grid */}
            <div className="grid grid-cols-1 gap-2 pt-1 text-xs text-muted-foreground sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
                <Database className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>{getDbLabel(result.data)}</span>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
                <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>{getLlmLabel(result.data)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{CONNECTION_STATUS_LABELS.backendUnreachable}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Reason: {result?.reason === 'timeout' ? 'Connection timed out (5s limit)' : result?.reason || 'Service unreachable'}. The application is operating in offline demonstration mode with mock threat data.
            </p>
          </div>
        )}

        {/* Development Fallback Warning */}
        {usingFallback && (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{CONNECTION_STATUS_LABELS.usingDevFallback}</span>
          </div>
        )}
      </div>
    </div>
  )
}
