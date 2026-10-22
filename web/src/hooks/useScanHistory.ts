/**
 * Custom hook for managing Scan History with cursor-based pagination,
 * rich filtering (risk, scan type, pinned, tags, text search), and mutations.
 */

import { useState, useEffect, useCallback } from 'react'
import { useCipherApi } from '@/lib/api/client'
import type { ScanSummaryItem } from '@/types/history'
import { ApiError } from '@/types/api'

export function useScanHistory() {
  const api = useCipherApi()
  const [items, setItems] = useState<ScanSummaryItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  // Filters
  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [pinnedFilter, setPinnedFilter] = useState<boolean | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [trigger, setTrigger] = useState(0)

  // Fetch initial page when filters change
  useEffect(() => {
    let ignore = false
    setLoading(true)

    api
      .listScans({
        risk_level: riskFilter !== 'all' ? riskFilter : undefined,
        scan_type: (typeFilter !== 'all' ? typeFilter : undefined) as any,
        q: searchQuery.trim() || undefined,
        tag: tagFilter.trim() || undefined,
        pinned: pinnedFilter !== null ? pinnedFilter : undefined,
        limit: 20,
      })
      .then((res) => {
        if (!ignore) {
          // Normalize items
          const normalized: ScanSummaryItem[] = res.items.map((it: any) => ({
            id: it.id,
            scan_type: it.scan_type,
            title: it.title || it.display_value || 'Scan Report',
            input_preview: it.input_preview || it.display_value || '',
            risk_score: it.risk_score,
            risk_level: it.risk_level,
            is_pinned: it.is_pinned ?? false,
            tags: it.tags ?? [],
            created_at: it.created_at,
          }))

          setItems(normalized)
          setNextCursor(res.next_cursor)
          setError(null)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err instanceof ApiError
              ? err
              : new ApiError('INTERNAL_ERROR', 'Failed to retrieve scan history.')
          )
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [api, riskFilter, typeFilter, searchQuery, tagFilter, pinnedFilter, trigger])

  // Load next page using cursor
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return

    setLoadingMore(true)
    try {
      const res = await api.listScans({
        risk_level: riskFilter !== 'all' ? riskFilter : undefined,
        scan_type: (typeFilter !== 'all' ? typeFilter : undefined) as any,
        q: searchQuery.trim() || undefined,
        tag: tagFilter.trim() || undefined,
        pinned: pinnedFilter !== null ? pinnedFilter : undefined,
        cursor: nextCursor,
        limit: 20,
      })

      const normalized: ScanSummaryItem[] = res.items.map((it: any) => ({
        id: it.id,
        scan_type: it.scan_type,
        title: it.title || it.display_value || 'Scan Report',
        input_preview: it.input_preview || it.display_value || '',
        risk_score: it.risk_score,
        risk_level: it.risk_level,
        is_pinned: it.is_pinned ?? false,
        tags: it.tags ?? [],
        created_at: it.created_at,
      }))

      setItems((prev) => [...prev, ...normalized])
      setNextCursor(res.next_cursor)
    } catch (err) {
      if (err instanceof ApiError) setError(err)
    } finally {
      setLoadingMore(false)
    }
  }, [api, nextCursor, loadingMore, riskFilter, typeFilter, searchQuery, tagFilter, pinnedFilter])

  const deleteScan = useCallback(
    async (scanId: string) => {
      try {
        await api.deleteScan(scanId)
        setItems((prev) => prev.filter((item) => item.id !== scanId))
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err)
        } else {
          setError(new ApiError('INTERNAL_ERROR', 'Failed to delete scan item.'))
        }
      }
    },
    [api]
  )

  const renameScan = useCallback(
    async (scanId: string, newTitle: string) => {
      if (!api.updateScan) return
      try {
        await api.updateScan(scanId, { title: newTitle })
        setItems((prev) =>
          prev.map((item) => (item.id === scanId ? { ...item, title: newTitle } : item))
        )
      } catch (err) {
        if (err instanceof ApiError) setError(err)
      }
    },
    [api]
  )

  const togglePin = useCallback(
    async (scanId: string, isPinned: boolean) => {
      if (!api.updateScan) return
      try {
        await api.updateScan(scanId, { is_pinned: !isPinned })
        setItems((prev) =>
          prev.map((item) => (item.id === scanId ? { ...item, is_pinned: !isPinned } : item))
        )
      } catch (err) {
        if (err instanceof ApiError) setError(err)
      }
    },
    [api]
  )

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    setTrigger((prev) => prev + 1)
  }, [])

  return {
    items,
    allItemsCount: items.length,
    loading,
    loadingMore,
    hasMore: Boolean(nextCursor),
    loadMore,
    error,
    riskFilter,
    setRiskFilter,
    typeFilter,
    setTypeFilter,
    tagFilter,
    setTagFilter,
    pinnedFilter,
    setPinnedFilter,
    searchQuery,
    setSearchQuery,
    deleteScan,
    renameScan,
    togglePin,
    refetch,
  }
}
