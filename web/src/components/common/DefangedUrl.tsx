import React, { useState } from 'react'
import { defangUrl, truncateForDisplay } from '@/lib/defang'
import { CopyButton } from './CopyButton'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DefangedUrlProps {
  url: string
  className?: string
  truncateThreshold?: number
  showCopy?: boolean
}

/**
 * Renders a defanged URL strictly as inert plain text.
 * Never renders as an HTML anchor by default to prevent accidental clicks.
 * Supports visual expansion for long targets while copying the full defanged text.
 */
export function DefangedUrl({
  url,
  className,
  truncateThreshold = 80,
  showCopy = true,
}: DefangedUrlProps) {
  const [expanded, setExpanded] = useState(false)
  const defanged = defangUrl(url)
  const { display, isTruncated } = truncateForDisplay(defanged, truncateThreshold)

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 max-w-full flex-wrap font-mono text-sm break-all',
        className
      )}
    >
      <span
        className="rounded bg-muted/70 px-2 py-1 select-all text-foreground border border-border/40"
        title={isTruncated && !expanded ? defanged : undefined}
      >
        {expanded ? defanged : display}
      </span>

      {isTruncated && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center text-xs text-primary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1 py-0.5"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse URL' : 'Expand full URL'}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 mr-0.5" /> Less
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5 mr-0.5" /> Full
            </>
          )}
        </button>
      )}

      {showCopy && (
        <CopyButton
          textToCopy={defanged}
          label="Copy defanged address"
          className="shrink-0"
        />
      )}
    </div>
  )
}
