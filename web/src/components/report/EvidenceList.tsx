/**
 * Evidence List Component.
 * Groups and displays evidence/indicators with highlighting and keyboard-navigable scroll-to targets.
 */

import React from 'react'
import type { Indicator } from '@/types/threat-report'
import { IndicatorList } from './IndicatorList'

export interface EvidenceListProps {
  indicators: Indicator[]
  highlightedIndicatorId?: string | null
  className?: string
}

export function EvidenceList({
  indicators,
  highlightedIndicatorId,
  className,
}: EvidenceListProps) {
  return (
    <div className={className}>
      <IndicatorList
        indicators={indicators}
        highlightedIndicatorId={highlightedIndicatorId}
      />
    </div>
  )
}
