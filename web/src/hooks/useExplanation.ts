/**
 * Independent useExplanation Hook with Retry and Abort Support.
 * Ensures threat reports remain fully visible even if AI explanation generation fails.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ThreatReport } from '@/types/threat-report'
import type { ExplanationResponse, AudienceLevel } from '@/types/explanation'
import { ApiError, normalizeApiError } from '@/lib/api/errors'
import { requestExplanation } from '@/lib/api/explanations'

export type ExplanationStatus = 'idle' | 'loading' | 'success' | 'error'

export interface UseExplanationReturn {
  status: ExplanationStatus
  data: ExplanationResponse | null
  error: ApiError | null
  run: (report: ThreatReport, audienceLevel?: AudienceLevel) => Promise<ExplanationResponse | null>
  retry: () => Promise<ExplanationResponse | null>
  reset: () => void
  cancel: () => void
}

export function useExplanation(): UseExplanationReturn {
  const [status, setStatus] = useState<ExplanationStatus>('idle')
  const [data, setData] = useState<ExplanationResponse | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const activeTokenRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)

  // Cache last requested report and audience level for seamless retry
  const lastReportRef = useRef<ThreatReport | null>(null)
  const lastAudienceRef = useRef<AudienceLevel>('simple')

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
    lastReportRef.current = null
    if (isMountedRef.current) {
      setStatus('idle')
      setData(null)
      setError(null)
    }
  }, [cancel])

  const run = useCallback(
    async (
      report: ThreatReport,
      audienceLevel: AudienceLevel = 'simple'
    ): Promise<ExplanationResponse | null> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      lastReportRef.current = report
      lastAudienceRef.current = audienceLevel

      const token = ++activeTokenRef.current
      const controller = new AbortController()
      abortControllerRef.current = controller

      setStatus('loading')
      setError(null)

      try {
        const response = await requestExplanation(report, audienceLevel, controller.signal)

        if (!isMountedRef.current || token !== activeTokenRef.current) {
          return null
        }

        setData(response)
        setStatus('success')
        return response
      } catch (err: unknown) {
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
    []
  )

  const retry = useCallback(async (): Promise<ExplanationResponse | null> => {
    if (!lastReportRef.current) return null
    return run(lastReportRef.current, lastAudienceRef.current)
  }, [run])

  return {
    status,
    data,
    error,
    run,
    retry,
    reset,
    cancel,
  }
}
