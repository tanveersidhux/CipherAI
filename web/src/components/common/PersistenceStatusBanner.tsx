/**
 * Persistence Status Banner displaying storage state of the current scan.
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, LogIn, HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PersistenceStatusBannerProps {
  status?: 'saved' | 'not_saved_guest' | 'save_failed' | null
  scanId?: string | null
  className?: string
}

export function PersistenceStatusBanner({
  status = 'not_saved_guest',
  scanId,
  className = '',
}: PersistenceStatusBannerProps) {
  if (status === 'saved') {
    return (
      <div
        className={`flex items-center gap-2 p-2.5 px-3.5 rounded-lg bg-success/10 border border-success/20 text-success text-xs font-medium ${className}`}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>Saved to your private scan history {scanId ? `(ID: ${scanId.slice(0, 8)})` : ''}</span>
      </div>
    )
  }

  if (status === 'save_failed') {
    return (
      <div
        role="alert"
        className={`flex items-center justify-between gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium ${className}`}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Notice: Failed to persist this scan record to your account.</span>
        </div>
      </div>
    )
  }

  // not_saved_guest
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-card/80 border border-border/70 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
        <HardDrive className="h-4 w-4 text-primary shrink-0" />
        <span>
          <strong className="text-foreground">Guest Mode:</strong> This scan is temporary and will not be saved to your audit trail.
        </span>
      </div>
      <a href="/login">
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 shrink-0">
          <LogIn className="h-3 w-3" />
          Sign in to save history
        </Button>
      </a>
    </div>
  )
}
