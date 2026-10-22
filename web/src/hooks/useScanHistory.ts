import { useState, useEffect, useCallback } from 'react'
import { useCipherApi } from '@/lib/api/client'
import type { ScanSummary } from '@/types/api'
import { ApiError } from '@/types/api'

export function useScanHistory() {
  const api = useCipherApi()
  const [items, setItems] = useState<ScanSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.listScans({
        risk_level: riskFilter !== 'all' ? riskFilter : undefined,
        scan_type: typeFilter !== 'all' ? typeFilter : undefined,
      })
      setItems(res.items)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err)
      } else {
        setError(
          new ApiError('INTERNAL_ERROR', 'Failed to retrieve scan history.')
        )
      }
    } finally {
      setLoading(false)
    }
  }, [api, riskFilter, typeFilter])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

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
        throw err
      }
    },
    [api]
  )

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true
    return item.display_value.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return {
    items: filteredItems,
    allItemsCount: items.length,
    loading,
    error,
    riskFilter,
    setRiskFilter,
    typeFilter,
    setTypeFilter,
    searchQuery,
    setSearchQuery,
    refetch: fetchHistory,
    deleteScan,
  }
}
