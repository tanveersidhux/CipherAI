/**
 * Universal useScan Hook with Stale-Response and Abort Protection.
 * Supports URL and Message scans with request token isolation.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ThreatReport } from '@/types/threat-report'
import { ApiError, normalizeApiError } from '@/lib/api/errors'
import { scanUrl, scanMessage, type ScanUrlParams, type ScanMessageParams } from '@/lib/api/scan'
import { useScanSession } from '@/context/ScanSessionProvider'

import { useCipherApi } from '@/lib/api/client'

export type ScanStatus = 'idle' | 'loading' | 'success' | 'error'

export interface UseScanReturn<TInput> {
  status: ScanStatus
  data: ThreatReport | null
  error: ApiError | null
  run: (input: TInput) => Promise<ThreatReport | null>
  reset: () => void
  cancel: () => void
}

/**
 * Hook for executing a URL scan with full lifecycle control.
 */
export function useUrlScan(): UseScanReturn<ScanUrlParams> {
  const api = useCipherApi()
  return useScanGeneric(async (params) => api.scanUrl(params))
}

/**
 * Hook for executing a Message scan with full lifecycle control.
 */
export function useMessageScan(): UseScanReturn<ScanMessageParams> {
  const api = useCipherApi()
  return useScanGeneric(async (params) => api.scanMessage(params))
}

/**
 * Generic scan runner managing lifecycle, in-flight cancellation,
 * and stale response rejection.
 */
export function useScanGeneric<TInput>(
  scanFn: (input: TInput, signal: AbortSignal) => Promise<ThreatReport>
): UseScanReturn<TInput> {
  const [status, setStatus] = useState<ScanStatus>('idle')
  const [data, setData] = useState<ThreatReport | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const activeTokenRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)

  const session = useScanSession()

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const cancel = useCallback(() => {
    activeTokenRef.current += 1
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (isMountedRef.current) {
      setStatus('idle')
    }
  }, [])

  const reset = useCallback(() => {
    cancel()
    if (isMountedRef.current) {
      setStatus('idle')
      setData(null)
      setError(null)
    }
  }, [cancel])

  const run = useCallback(
    async (input: TInput): Promise<ThreatReport | null> => {
      // Prevent double-execution / cancel previous
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const token = ++activeTokenRef.current
      const controller = new AbortController()
      abortControllerRef.current = controller

      setStatus('loading')
      setError(null)

      try {
        const report = await scanFn(input, controller.signal)

        // Stale check
        if (!isMountedRef.current || token !== activeTokenRef.current) {
          return null
        }

        setData(report)
        setStatus('success')

        // Register in session history
        if (session) {
          session.addScan(report)
        }

        return report
      } catch (err: unknown) {
        // If aborted or stale, ignore error
        if (!isMountedRef.current || token !== activeTokenRef.current) {
          return null
        }

        const apiErr = normalizeApiError(err)
        setError(apiErr)
        setStatus('error')
        return null
      } finally {
        if (token === activeTokenRef.current) {
          abortControllerRef.current = null
        }
      }
    },
    [scanFn, session]
  )

  return {
    status,
    data,
    error,
    run,
    reset,
    cancel,
  }
}
