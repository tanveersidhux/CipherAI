import React, { useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { RiskLevel } from '@/types/threat-report'
import { Button } from '@/components/ui/button'
import { Table, BarChart2 } from 'lucide-react'
import { RISK_LEVEL_LABELS } from '@/lib/content/wording'
import { cn } from '@/lib/utils'

export interface RiskDistributionChartProps {
  distribution: Record<RiskLevel, number>
  className?: string
}

const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
  inconclusive: '#64748B',
}

export function RiskDistributionChart({
  distribution,
  className,
}: RiskDistributionChartProps) {
  const [showTable, setShowTable] = useState(false)

  const data = (['low', 'medium', 'high', 'critical', 'inconclusive'] as RiskLevel[]).map(
    (level) => ({
      name: RISK_LEVEL_LABELS[level],
      level,
      value: distribution[level] ?? 0,
      color: RISK_COLORS[level],
    })
  )

  const total = data.reduce((acc, curr) => acc + curr.value, 0)
  const summaryText = data.map((d) => `${d.name}: ${d.value}`).join(' | ')

  return (
    <div className={cn('rounded-lg border border-border/60 bg-card/70 p-5 space-y-4', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Risk Level Distribution</h3>
          <p className="text-xs text-muted-foreground">
            Categorical threat breakdown for active session ({total} total scans)
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTable(!showTable)}
          className="h-8 text-xs gap-1.5 self-start sm:self-auto min-h-[36px]"
          aria-expanded={showTable}
        >
          {showTable ? (
            <>
              <BarChart2 className="h-3.5 w-3.5" />
              <span>Show Chart</span>
            </>
          ) : (
            <>
              <Table className="h-3.5 w-3.5" />
              <span>Show Data Table</span>
            </>
          )}
        </Button>
      </div>

      {/* Screen Reader and Fallback Text Summary */}
      <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded border border-border/30">
        <strong className="text-foreground">Text Summary: </strong>
        <span>{summaryText}</span>
      </div>

      {showTable ? (
        /* Accessible Data Table Alternative */
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs border-collapse" aria-label="Risk Distribution Data Table">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground font-semibold">
                <th className="py-2 px-3">Risk Level</th>
                <th className="py-2 px-3 text-right">Count</th>
                <th className="py-2 px-3 text-right">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {data.map((row) => (
                <tr key={row.level} className="hover:bg-muted/20">
                  <td className="py-2 px-3 flex items-center gap-2 font-medium">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: row.color }}
                      aria-hidden="true"
                    />
                    <span>{row.name}</span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-semibold">{row.value}</td>
                  <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                    {total > 0 ? `${((row.value / total) * 100).toFixed(1)}%` : '0%'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Recharts Donut Visual */
        <div className="h-56 w-full pt-2">
          {total === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No scans recorded yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((entry) => (
                    <Cell key={entry.level} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} scans`, name]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '0.375rem',
                    fontSize: '12px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  )
}
