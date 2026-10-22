import React from 'react'
import { Info } from 'lucide-react'
import { MANDATORY_DISCLAIMERS } from '@/lib/content/wording'
import { cn } from '@/lib/utils'

export interface DisclaimerBannerProps {
  customText?: string
  className?: string
}

/**
 * Standard CIPHER AI disclaimer banner.
 * Displays the exact mandatory limitation sentence to satisfy the zero-guarantee invariant.
 */
export function DisclaimerBanner({
  customText,
  className,
}: DisclaimerBannerProps) {
  const text = customText || MANDATORY_DISCLAIMERS.lowRiskLimitation

  return (
    <aside
      role="note"
      aria-label="Security evaluation disclaimer"
      className={cn(
        'flex items-start gap-3 rounded-lg border border-border/70 bg-muted/40 p-3.5 text-xs text-muted-foreground leading-relaxed',
        className
      )}
    >
      <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden="true" />
      <div>
        <span className="font-semibold text-foreground mr-1">Notice:</span>
        <span>{text}</span>
      </div>
    </aside>
  )
}
