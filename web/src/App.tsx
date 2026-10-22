import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { CipherApiProvider } from '@/lib/api/client'
import { ScanSessionProvider } from '@/context/ScanSessionProvider'
import { AppErrorBoundary } from '@/components/common/AppErrorBoundary'
import { ServiceBanner } from '@/components/common/ServiceBanner'
import { AppRoutes } from '@/routes'

export default function App() {
  return (
    <AppErrorBoundary>
      <CipherApiProvider>
        <ScanSessionProvider>
          <BrowserRouter>
            <ServiceBanner />
            <AppRoutes />
          </BrowserRouter>
        </ScanSessionProvider>
      </CipherApiProvider>
    </AppErrorBoundary>
  )
}
