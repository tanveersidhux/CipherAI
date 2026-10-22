import React from 'react'
import type { ConfidenceLevel } from '@/types/threat-report'
import { cn } from '@/lib/utils'

export interface ConfidenceMeterProps {
  confidence: ConfidenceLevel
  className?: string
}

export function ConfidenceMeter({ confidence, className }: ConfidenceMeterProps) {
  const bars = confidence === 'high' ? 3 : confidence === 'medium' ? 2 : 1

  return (
    <div
      className={cn('inline-flex items-center gap-2 text-xs', className)}
      role="group"
      aria-label={`Evaluation Confidence: ${confidence}`}
    >
      <span className="text-muted-foreground font-medium">Confidence:</span>
      <div className="flex items-center gap-1" aria-hidden="true">
        {[1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn(
              'h-3 w-1.5 rounded-xs transition-colors',
              index <= bars
                ? 'bg-primary'
                : 'bg-muted-foreground/20'
            )}
          />
        ))}
      </div>
      <span className="font-semibold uppercase tracking-wider text-foreground text-[11px]">
        {confidence}
      </span>
    </div>
  )
}
