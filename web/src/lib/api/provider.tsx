import React, { useContext, useMemo } from 'react'
import type { CipherApi } from '@/types/api'
import { HttpCipherApi } from './http-client'
import { CipherApiContext } from './context'

export { CipherApiContext }

export interface CipherApiProviderProps {
  api?: CipherApi
  children: React.ReactNode
}

/**
 * Provides the CipherApi instance to the entire application.
 * Defaults to HttpCipherApi in Phase 06 connecting directly to FastAPI backend.
 */
export function CipherApiProvider({ api, children }: CipherApiProviderProps) {
  const client = useMemo(() => api ?? new HttpCipherApi(), [api])

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
    return new HttpCipherApi()
  }
  return context
}
