import React, { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Table, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TimeSeriesPoint {
  date: string
  count: number
}

export interface ScanTrendChartProps {
  data: TimeSeriesPoint[]
  className?: string
}

export function ScanTrendChart({ data, className }: ScanTrendChartProps) {
  const [showTable, setShowTable] = useState(false)

  const total = data.reduce((acc, curr) => acc + curr.count, 0)
  const average = data.length > 0 ? (total / data.length).toFixed(1) : '0'

  return (
    <div className={cn('rounded-lg border border-border/60 bg-card/70 p-5 space-y-4', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Scan Activity Trend</h3>
          <p className="text-xs text-muted-foreground">
            Daily threat scanning volume ({total} total scans across period)
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
              <TrendingUp className="h-3.5 w-3.5" />
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
        <span>
          Activity recorded across {data.length} periods, averaging {average} scans per day with a cumulative total of {total} scans.
        </span>
      </div>

      {showTable ? (
        /* Accessible Data Table Alternative */
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs border-collapse" aria-label="Scan Trend Historical Data Table">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground font-semibold">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3 text-right">Scans Executed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {data.map((point) => (
                <tr key={point.date} className="hover:bg-muted/20">
                  <td className="py-2 px-3 font-mono font-medium">{point.date}</td>
                  <td className="py-2 px-3 text-right font-mono font-semibold">{point.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Recharts Area Visual */
        <div className="h-56 w-full pt-2">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No trend data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(val) => val.slice(5)}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  formatter={(val: any) => [`${val} scans`, 'Volume']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '0.375rem',
                    fontSize: '12px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#trendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  )
}
