/**
 * CIPHER AI Single Source of Truth for Risk Level Presentation and Cautious Wording.
 * Invariant: Never describe a target as 'safe' or use a green affirmative badge for absence of indicators.
 */

import type { RiskLevel } from '@/types/threat-report'
import {
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  AlertOctagon,
  ShieldCheck,
} from 'lucide-react'
import type { ComponentType } from 'react'

export interface RiskPresentation {
  label: string
  verdictDescription: string
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'
  textColor: string
  bgColor: string
  borderColor: string
  Icon: ComponentType<{ className?: string }>
}

export const RISK_LEVEL_CONFIG: Record<RiskLevel, RiskPresentation> = {
  critical: {
    label: 'Critical Threat Alert',
    verdictDescription:
      'Severe threat markers and malicious behaviors detected. Do not interact.',
    badgeVariant: 'destructive',
    textColor: 'text-red-500 dark:text-red-400',
    bgColor: 'bg-red-500/10 dark:bg-red-500/20',
    borderColor: 'border-red-500/30',
    Icon: AlertOctagon,
  },
  high: {
    label: 'High Risk Detected',
    verdictDescription:
      'Strong indicators of social engineering, credential harvesting, or deception.',
    badgeVariant: 'destructive',
    textColor: 'text-orange-500 dark:text-orange-400',
    bgColor: 'bg-orange-500/10 dark:bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    Icon: ShieldAlert,
  },
  medium: {
    label: 'Medium Risk / Suspicious',
    verdictDescription:
      'Unusual lexical or transmission patterns observed requiring verification.',
    badgeVariant: 'secondary',
    textColor: 'text-amber-500 dark:text-amber-400',
    bgColor: 'bg-amber-500/10 dark:bg-amber-500/20',
    borderColor: 'border-amber-500/30',
    Icon: AlertTriangle,
  },
  low: {
    label: 'Low Risk Indicators Found',
    verdictDescription:
      'Absence of detected threat markers does not guarantee an asset is safe. Exercise normal caution.',
    badgeVariant: 'outline',
    textColor: 'text-sky-500 dark:text-sky-400',
    bgColor: 'bg-sky-500/10 dark:bg-sky-500/20',
    borderColor: 'border-sky-500/30',
    Icon: ShieldCheck,
  },
  inconclusive: {
    label: 'Inconclusive Analysis',
    verdictDescription:
      'Inconclusive: not enough information to judge safely. Proceed with cautious verification.',
    badgeVariant: 'outline',
    textColor: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-border',
    Icon: HelpCircle,
  },
}

export function getRiskDetails(level: RiskLevel): RiskPresentation {
  return RISK_LEVEL_CONFIG[level] || RISK_LEVEL_CONFIG.inconclusive
}

export function getRiskLabel(level: RiskLevel): string {
  return getRiskDetails(level).label
}

export function getRiskDescription(level: RiskLevel): string {
  return getRiskDetails(level).verdictDescription
}
