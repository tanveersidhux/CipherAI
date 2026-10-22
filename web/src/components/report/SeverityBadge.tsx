import React from 'react'
import type { SeverityLevel } from '@/types/threat-report'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface SeverityBadgeProps {
  severity: SeverityLevel
  className?: string
}

const SEVERITY_STYLES: Record<SeverityLevel, string> = {
  info: 'border-border/60 bg-muted text-muted-foreground',
  low: 'border-risk-low-border/60 bg-risk-low/50 text-risk-low-foreground',
  medium: 'border-risk-medium-border/60 bg-risk-medium/50 text-risk-medium-foreground',
  high: 'border-risk-high-border/60 bg-risk-high/50 text-risk-high-foreground',
  critical: 'border-risk-critical-border/60 bg-risk-critical/50 text-risk-critical-foreground font-bold',
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'uppercase tracking-wider text-[10px] font-semibold px-2 py-0.5',
        SEVERITY_STYLES[severity] || SEVERITY_STYLES.info,
        className
      )}
    >
      {severity.toUpperCase()}
    </Badge>
  )
}
