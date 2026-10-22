import { useState, useEffect, useCallback } from 'react'
import { useCipherApi } from '@/lib/api/client'
import type { DashboardSummaryResponse } from '@/types/dashboard'
import { ApiError } from '@/types/api'

export function useDashboardSummary(rangeDays: number = 30) {
  const api = useCipherApi()
  const [data, setData] = useState<DashboardSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [trigger, setTrigger] = useState(0)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    api
      .getDashboardSummary(rangeDays)
      .then((summary) => {
        if (!ignore) {
          setData(summary)
          setError(null)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err instanceof ApiError
              ? err
              : new ApiError('INTERNAL_ERROR', 'Failed to retrieve dashboard analytics.')
          )
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [api, rangeDays, trigger])

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    setTrigger((prev) => prev + 1)
  }, [])

  return { data, loading, error, refetch }
}

