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
  const [trigger, setTrigger] = useState(0)

  useEffect(() => {
    let ignore = false
    api
      .listScans({
        risk_level: riskFilter !== 'all' ? riskFilter : undefined,
        scan_type: typeFilter !== 'all' ? typeFilter : undefined,
      })
      .then((res) => {
        if (!ignore) {
          setItems(res.items)
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
  }, [api, riskFilter, typeFilter, trigger])

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

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    setTrigger((prev) => prev + 1)
  }, [])

  // Filter items client-side by search query (display value or ID)
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      item.display_value.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q)
    )
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
    deleteScan,
    refetch,
  }
}
