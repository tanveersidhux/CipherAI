import React, { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'

// Lazy-loaded pages for lean bundle splitting
const LandingPage = lazy(() => import('@/pages/LandingPage'))
const ScanUrlPage = lazy(() => import('@/pages/ScanUrlPage'))
const ScanMessagePage = lazy(() => import('@/pages/ScanMessagePage'))
const ReportPage = lazy(() => import('@/pages/ReportPage'))
const HistoryPage = lazy(() => import('@/pages/HistoryPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const CasesPlaceholderPage = lazy(() => import('@/pages/CasesPlaceholderPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

// Dev-only state switcher loaded exclusively when import.meta.env.DEV is true
const StatesPage = import.meta.env.DEV
  ? lazy(() => import('@/pages/dev/StatesPage'))
  : null

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="report" className="p-8 max-w-4xl mx-auto" />}>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<LandingPage />} />
          <Route path="scan/url" element={<ScanUrlPage />} />
          <Route path="scan/message" element={<ScanMessagePage />} />
          <Route path="reports/:reportId" element={<ReportPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="cases" element={<CasesPlaceholderPage />} />

          {/* Development-only preview harness */}
          {import.meta.env.DEV && StatesPage && (
            <Route path="dev/states" element={<StatesPage />} />
          )}

          {/* Catch-all Not Found Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
