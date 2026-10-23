import { useState, useCallback } from 'react'
import { useCipherApi } from '@/lib/api/client'
import { useScanSession } from '@/context/ScanSessionProvider'
import { ApiError } from '@/types/api'
import type { FormStatus } from '@/types/ui'
import type { ThreatReport } from '@/types/threat-report'
import { validateMessageInput, validateUrlInput } from '@/lib/validation/scan-validation'

export function useScanForm() {
  const api = useCipherApi()
  const session = useScanSession()
  const [status, setStatus] = useState<FormStatus>('idle')
  const [error, setError] = useState<ApiError | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [result, setResult] = useState<ThreatReport | null>(null)

  const scanUrl = useCallback(
    async (rawUrl: string, options?: { use_ai?: boolean; persist?: boolean }) => {
      setError(null)
      const validation = validateUrlInput(rawUrl)
      if (!validation.isValid) {
        setValidationError(validation.error)
        setStatus('error')
        return null
      }

      setValidationError(null)
      setStatus('submitting')

      try {
        const report = await api.scanUrl({ url: rawUrl, options })
        session.addScan(report)
        setResult(report)
        setStatus('success')
        return report
      } catch (err) {
        setStatus('error')
        if (err instanceof ApiError) {
          setError(err)
        } else {
          setError(
            new ApiError(
              'INTERNAL_ERROR',
              (err as Error).message || 'An unexpected error occurred.',
              [],
              'err_unknown_trace'
            )
          )
        }
        return null
      }
    },
    [api, session]
  )

  const scanMessage = useCallback(
    async (
      rawMessage: string,
      channel: 'sms' | 'email_body' | 'chat' | 'social' | 'unknown' = 'unknown',
      options?: { use_ai?: boolean; persist?: boolean }
    ) => {
      setError(null)
      const validation = validateMessageInput(rawMessage)
      if (!validation.isValid) {
        setValidationError(validation.error)
        setStatus('error')
        return null
      }

      setValidationError(null)
      setStatus('submitting')

      try {
        const report = await api.scanMessage({
          message: rawMessage,
          channel,
          options,
        })
        session.addScan(report)
        setResult(report)
        setStatus('success')
        return report
      } catch (err) {
        setStatus('error')
        if (err instanceof ApiError) {
          setError(err)
        } else {
          setError(
            new ApiError(
              'INTERNAL_ERROR',
              (err as Error).message || 'An unexpected error occurred.',
              [],
              'err_unknown_trace'
            )
          )
        }
        return null
      }
    },
    [api, session]
  )

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setValidationError(null)
    setResult(null)
  }, [])

  return {
    status,
    error,
    validationError,
    result,
    scanUrl,
    scanMessage,
    reset,
  }
}
