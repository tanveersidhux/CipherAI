import React from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
} from 'lucide-react'
import type { RiskLevel } from '@/types/threat-report'
import { RISK_LEVEL_LABELS } from '@/lib/content/wording'
import { cn } from '@/lib/utils'

export interface RiskBadgeProps {
  level: RiskLevel
  showIcon?: boolean
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

const RISK_ICONS = {
  low: ShieldCheck,
  medium: ShieldAlert,
  high: AlertTriangle,
  critical: AlertOctagon,
  inconclusive: HelpCircle,
}

const RISK_BADGE_STYLES: Record<RiskLevel, string> = {
  low: 'border-risk-low-border bg-risk-low text-risk-low-foreground',
  medium: 'border-risk-medium-border bg-risk-medium text-risk-medium-foreground',
  high: 'border-risk-high-border bg-risk-high text-risk-high-foreground',
  critical: 'border-risk-critical-border bg-risk-critical text-risk-critical-foreground',
  inconclusive: 'border-risk-inconclusive-border bg-risk-inconclusive text-risk-inconclusive-foreground',
}

export function RiskBadge({
  level,
  showIcon = true,
  className,
  size = 'default',
}: RiskBadgeProps) {
  const Icon = RISK_ICONS[level] ?? HelpCircle
  const label = RISK_LEVEL_LABELS[level] ?? 'Evaluation inconclusive'

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    default: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  }

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    default: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border font-medium select-none shadow-xs transition-colors',
        RISK_BADGE_STYLES[level] ?? RISK_BADGE_STYLES.inconclusive,
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label={`Risk Level: ${label}`}
    >
      {showIcon && <Icon className={cn(iconSizes[size], 'shrink-0')} aria-hidden="true" />}
      <span>{label}</span>
    </span>
  )
}
