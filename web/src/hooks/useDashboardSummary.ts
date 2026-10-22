import { useState, useEffect, useCallback } from 'react'
import { useCipherApi } from '@/lib/api/client'
import type { DashboardSummary } from '@/types/api'
import { ApiError } from '@/types/api'

export function useDashboardSummary() {
  const api = useCipherApi()
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const summary = await api.getDashboardSummary()
      setData(summary)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err)
      } else {
        setError(
          new ApiError('INTERNAL_ERROR', 'Failed to retrieve dashboard analytics.')
        )
      }
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return { data, loading, error, refetch: fetchSummary }
}
