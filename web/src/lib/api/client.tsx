import React, { createContext, useContext, useMemo } from 'react'
import type { CipherApi } from '@/types/api'
import { MockCipherApi } from './mocks/mock-client'

export const CipherApiContext = createContext<CipherApi | null>(null)

export interface CipherApiProviderProps {
  api?: CipherApi
  children: React.ReactNode
}

/**
 * Provides the CipherApi instance to the entire application.
 * Defaults to MockCipherApi in Phase 02; swapped for HttpCipherApi in Phase 06.
 */
export function CipherApiProvider({ api, children }: CipherApiProviderProps) {
  const client = useMemo(() => api ?? new MockCipherApi(), [api])

  return (
    <CipherApiContext.Provider value={client}>
      {children}
    </CipherApiContext.Provider>
  )
}

/**
 * Hook allowing components to consume the CipherApi client interface.
 */
export function useCipherApi(): CipherApi {
  const context = useContext(CipherApiContext)
  if (!context) {
    throw new Error('useCipherApi must be used within a CipherApiProvider')
  }
  return context
}

export * from '@/types/api'
