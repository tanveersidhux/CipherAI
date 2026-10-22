import React from 'react'
import type { RiskLevel } from '@/types/threat-report'
import { RISK_LEVEL_LABELS } from '@/lib/content/wording'
import { cn } from '@/lib/utils'

export interface RiskGaugeProps {
  score: number
  level: RiskLevel
  size?: number
  className?: string
}

export function RiskGauge({
  score,
  level,
  size = 140,
  className,
}: RiskGaugeProps) {
  const isInconclusive = level === 'inconclusive'
  const normalizedScore = isInconclusive ? 0 : Math.min(100, Math.max(0, score))
  const levelLabel = RISK_LEVEL_LABELS[level]

  // SVG Gauge calculations (semi-circular / circular arc)
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  // We use a 240-degree arc for an instrument meter feel
  const arcDegree = 240
  const arcLength = (circumference * arcDegree) / 360
  const strokeDashoffset = arcLength - (arcLength * normalizedScore) / 100

  const getStrokeColor = () => {
    switch (level) {
      case 'low':
        return 'text-emerald-500 dark:text-emerald-400'
      case 'medium':
        return 'text-amber-500 dark:text-amber-400'
      case 'high':
        return 'text-orange-500 dark:text-orange-400'
      case 'critical':
        return 'text-red-500 dark:text-red-400'
      case 'inconclusive':
      default:
        return 'text-slate-400 dark:text-slate-500'
    }
  }

  return (
    <div
      role="meter"
      aria-label={`Risk Score: ${isInconclusive ? 'Inconclusive' : `${normalizedScore} out of 100`} - ${levelLabel}`}
      aria-valuenow={isInconclusive ? undefined : normalizedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'relative flex flex-col items-center justify-center shrink-0 select-none',
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[150deg] transform"
        aria-hidden="true"
      >
        {/* Track Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          className="text-muted/60"
        />
        {/* Value Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(
            'transition-all duration-700 ease-out',
            getStrokeColor()
          )}
        />
      </svg>

      {/* Numerical and State Center Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-extrabold text-3xl tracking-tight text-foreground">
          {isInconclusive ? 'N/A' : normalizedScore}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
          {isInconclusive ? 'No Score' : 'Risk Score'}
        </span>
      </div>
    </div>
  )
}
