import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, ExternalLink, ArrowUpDown } from 'lucide-react'
import type { ScanSummary } from '@/types/api'
import { RiskBadge } from '@/components/report/RiskBadge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { EMPTY_STATES } from '@/lib/content/wording'
import { cn } from '@/lib/utils'

export interface ScanHistoryTableProps {
  items: ScanSummary[]
  onDelete: (scanId: string) => Promise<void>
  className?: string
}

type SortField = 'date' | 'risk'

export function ScanHistoryTable({
  items,
  onDelete,
  className,
}: ScanHistoryTableProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortAsc, setSortAsc] = useState<boolean>(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const sortedItems = [...items].sort((a, b) => {
    if (sortField === 'date') {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return sortAsc ? -diff : diff
    } else {
      const diff = b.risk_score - a.risk_score
      return sortAsc ? -diff : diff
    }
  })

  const confirmDelete = async () => {
    if (deleteTargetId) {
      await onDelete(deleteTargetId)
      setDeleteTargetId(null)
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={EMPTY_STATES.history.title}
        description={EMPTY_STATES.history.description}
        className={className}
      />
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block overflow-hidden rounded-lg border border-border/60 bg-card/70">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse" aria-label="Scan History Records">
            <thead>
              <tr className="border-b border-border/40 bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                <th scope="col" className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort('date')}
                    className="inline-flex items-center gap-1.5 hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                  >
                    <span>Date & Time</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th scope="col" className="px-4 py-3">Type</th>
                <th scope="col" className="px-4 py-3">Target / Fragment</th>
                <th scope="col" className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort('risk')}
                    className="inline-flex items-center gap-1.5 hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                  >
                    <span>Risk Level & Score</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {sortedItems.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3.5 text-xs uppercase font-mono font-semibold text-primary">
                    {item.scan_type}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono max-w-xs truncate text-foreground" title={item.display_value || (item as any).title || (item as any).input_preview}>
                    {item.display_value || (item as any).title || (item as any).input_preview}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <RiskBadge level={item.risk_level} size="sm" />
                      <span className="font-mono text-xs font-semibold text-muted-foreground">
                        {item.risk_score}/100
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link to={`/reports/${item.id}`} aria-label={`View report for ${item.display_value}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[36px] min-w-[36px]">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeleteTargetId(item.id)
                          setConfirmOpen(true)
                        }}
                        className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10 min-h-[36px] min-w-[36px]"
                        aria-label={`Delete scan ${item.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Layout (< 768px) */}
      <div className="md:hidden space-y-3" role="feed" aria-label="Scan History Cards">
        {sortedItems.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-border/60 bg-card/80 p-4 space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-mono uppercase text-primary font-bold">{item.scan_type}</span>
              <span>{new Date(item.created_at).toLocaleDateString()}</span>
            </div>

            <p className="font-mono text-xs text-foreground break-all bg-muted/40 p-2 rounded">
              {item.display_value || (item as any).title || (item as any).input_preview}
            </p>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <RiskBadge level={item.risk_level} size="sm" />
                <span className="font-mono text-xs font-semibold">{item.risk_score} pts</span>
              </div>

              <div className="flex items-center gap-2">
                <Link to={`/reports/${item.id}`}>
                  <Button variant="outline" size="sm" className="h-8 text-xs min-h-[36px]">
                    Report
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setDeleteTargetId(item.id)
                    setConfirmOpen(true)
                  }}
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 min-h-[36px] min-w-[36px]"
                  aria-label="Delete scan"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Scan from Session History"
        description="Are you sure you want to delete this scan report? This action cannot be undone."
        confirmText="Delete Report"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
