import React from 'react'
import { History, Search, Filter, Bookmark, Loader2 } from 'lucide-react'
import { useScanHistory } from '@/hooks/useScanHistory'
import { ScanHistoryTable } from '@/components/common/ScanHistoryTable'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function HistoryPage() {
  const {
    items,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    error,
    riskFilter,
    setRiskFilter,
    typeFilter,
    setTypeFilter,
    pinnedFilter,
    setPinnedFilter,
    searchQuery,
    setSearchQuery,
    deleteScan,
    refetch,
  } = useScanHistory()

  return (
    <div className="space-y-6 py-2 md:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
            <History className="h-4 w-4" />
            <span>Audit Trail</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Scan History
          </h1>
          <p className="text-sm text-muted-foreground">
            Review past URL and message threat assessments recorded in your secure account.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-card/60 p-4 rounded-lg border border-border/50">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by URL, keyword, or indicator..."
            className="pl-9 h-10 text-xs sm:text-sm"
            aria-label="Search scan history"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              aria-label="Filter by risk tier"
              className="rounded-md border border-input bg-background px-2.5 py-2 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-10"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="inconclusive">Inconclusive</option>
            </select>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by scan type"
            className="rounded-md border border-input bg-background px-2.5 py-2 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-10"
          >
            <option value="all">All Types</option>
            <option value="url">URL</option>
            <option value="message">Message</option>
            <option value="email">Email</option>
          </select>

          <Button
            type="button"
            variant={pinnedFilter ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPinnedFilter(pinnedFilter ? null : true)}
            className="h-10 text-xs gap-1.5"
            title="Filter by pinned items"
          >
            <Bookmark className="h-3.5 w-3.5" />
            Pinned
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton variant="table" />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <div className="space-y-4">
          <ScanHistoryTable items={items as any} onDelete={deleteScan} />

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
                className="gap-2 text-xs h-9 min-w-[120px]"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More Scans'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
