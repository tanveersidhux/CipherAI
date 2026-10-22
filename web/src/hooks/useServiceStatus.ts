/**
 * Hook for monitoring Backend Health and AI Provider availability.
 * Powers the offline ServiceBanner and adaptive UI treatments.
 */

import { useState, useEffect, useCallback } from 'react'
import { getHealth } from '@/lib/api/health'
import { getAiStatus } from '@/lib/api/explanations'

export interface ServiceStatusState {
  isChecking: boolean
  isBackendReachable: boolean
  aiEnabled: boolean
  providerConfigured: boolean
  model: string | null
  refetch: () => Promise<void>
}

export function useServiceStatus(): ServiceStatusState {
  const [isChecking, setIsChecking] = useState(true)
  const [isBackendReachable, setIsBackendReachable] = useState(true)
  const [aiEnabled, setAiEnabled] = useState(true)
  const [providerConfigured, setProviderConfigured] = useState(false)
  const [model, setModel] = useState<string | null>(null)

  const check = useCallback(async () => {
    setIsChecking(true)
    try {
      const [healthRes, aiRes] = await Promise.allSettled([
        getHealth(),
        getAiStatus(),
      ])

      if (healthRes.status === 'fulfilled') {
        setIsBackendReachable(healthRes.value.ok)
      } else {
        setIsBackendReachable(false)
      }

      if (aiRes.status === 'fulfilled') {
        setAiEnabled(aiRes.value.ai_enabled)
        setProviderConfigured(aiRes.value.provider_configured)
        setModel(aiRes.value.model)
      }
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    check()
  }, [check])

  return {
    isChecking,
    isBackendReachable,
    aiEnabled,
    providerConfigured,
    model,
    refetch: check,
  }
}
