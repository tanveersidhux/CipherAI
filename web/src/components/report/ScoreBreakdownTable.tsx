import React from 'react'
import type { ScoreContribution } from '@/types/threat-report'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface ScoreBreakdownTableProps {
  scoreContributions: ScoreContribution[]
  finalRiskScore?: number
  className?: string
}

export function ScoreBreakdownTable({
  scoreContributions,
  finalRiskScore,
  className,
}: ScoreBreakdownTableProps) {
  // Sum raw points contributed
  const rawSum = scoreContributions.reduce((sum, item) => sum + item.points, 0)
  // Clamp sum to 0-100 range
  const clampedTotal = Math.min(100, Math.max(0, rawSum))
  const displayScore = finalRiskScore !== undefined ? finalRiskScore : clampedTotal

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border/60 bg-card/70', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse" aria-label="Score Contribution Breakdown Table">
          <thead>
            <tr className="border-b border-border/40 bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              <th scope="col" className="px-4 py-3">Indicator Code</th>
              <th scope="col" className="px-4 py-3">Kind</th>
              <th scope="col" className="px-4 py-3">Points</th>
              <th scope="col" className="px-4 py-3 hidden md:table-cell">Rationale</th>
              <th scope="col" className="px-4 py-3 text-right">Capped?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {scoreContributions.map((item, index) => (
              <tr key={`${item.indicator_id}-${index}`} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
                  {item.indicator_id}
                </td>
                <td className="px-4 py-3 text-xs capitalize text-muted-foreground">
                  {item.evidence_kind}
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-foreground">
                  +{item.points}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                  {item.reason}
                </td>
                <td className="px-4 py-3 text-xs text-right">
                  {item.capped ? (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-500 text-[10px]">
                      Capped
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border/60 bg-muted/30 font-bold text-foreground">
              <td colSpan={2} className="px-4 py-3 text-xs uppercase tracking-wider">
                Total Risk Score (Clamped 0–100)
              </td>
              <td className="px-4 py-3 text-sm text-primary font-bold">
                {displayScore} / 100
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground font-normal">
                {rawSum > 100 ? `Raw sum of ${rawSum} capped at maximum 100` : 'Aggregate weighted sum'}
              </td>
              <td className="px-4 py-3 text-right text-xs">
                {rawSum > 100 ? (
                  <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                    Clamped
                  </Badge>
                ) : null}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
