/**
 * Dismissible Offline / Service Unavailable Top Banner.
 * Appears non-intrusively when backend health check fails.
 */

import React, { useState } from 'react'
import { WifiOff, X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useServiceStatus } from '@/hooks/useServiceStatus'

export function ServiceBanner() {
  const { isBackendReachable, isChecking, refetch } = useServiceStatus()
  const [dismissed, setDismissed] = useState(false)

  if (isChecking || isBackendReachable || dismissed) {
    return null
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-400 px-4 py-2.5 text-xs flex items-center justify-between gap-3 sticky top-0 z-50 backdrop-blur-md"
    >
      <div className="flex items-center gap-2 max-w-[800px] mx-auto flex-1">
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="leading-tight">
          <strong>Backend Service Unavailable: </strong>
          Cannot connect to the CIPHER AI API engine. Live scans and AI features are temporarily operating in offline mode.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="h-7 text-[11px] gap-1 border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Retry Connection</span>
        </Button>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 transition-colors"
          aria-label="Dismiss service banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
