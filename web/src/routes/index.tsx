import React, { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

// Lazy-loaded pages for lean bundle splitting
const LandingPage = lazy(() => import('@/pages/LandingPage'))
const ScanUrlPage = lazy(() => import('@/pages/ScanUrlPage'))
const ScanMessagePage = lazy(() => import('@/pages/ScanMessagePage'))
const EmailScanPage = lazy(() => import('@/pages/EmailScanPage'))
const BatchesPage = lazy(() => import('@/pages/BatchesPage'))
const BatchDetailPage = lazy(() => import('@/pages/BatchDetailPage'))
const PrintReportPage = lazy(() => import('@/pages/PrintReportPage'))
const ReportPage = lazy(() => import('@/pages/ReportPage'))
const HistoryPage = lazy(() => import('@/pages/HistoryPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const CasesPage = lazy(() => import('@/pages/CasesPage'))
const CaseDetailPage = lazy(() => import('@/pages/CaseDetailPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

// Dev-only state switcher loaded exclusively when import.meta.env.DEV is true
const StatesPage = import.meta.env.DEV
  ? lazy(() => import('@/pages/dev/StatesPage'))
  : null

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="report" className="p-8 max-w-4xl mx-auto" />}>
      <Routes>
        <Route path="reports/:scanId/print" element={<PrintReportPage />} />
        <Route path="/" element={<AppShell />}>
          <Route index element={<LandingPage />} />
          <Route path="scan/url" element={<ScanUrlPage />} />
          <Route path="scan/message" element={<ScanMessagePage />} />
          <Route path="scan/email" element={<EmailScanPage />} />
          <Route path="reports/:reportId" element={<ReportPage />} />
          <Route path="login" element={<LoginPage />} />
          
          <Route
            path="batches"
            element={
              <ProtectedRoute>
                <BatchesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="batches/:batchId"
            element={
              <ProtectedRoute>
                <BatchDetailPage />
              </ProtectedRoute>
            }
          />
          
          {/* Protected Routes requiring Supabase authentication */}
          <Route
            path="history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="cases"
            element={
              <ProtectedRoute>
                <CasesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="cases/:caseId"
            element={
              <ProtectedRoute>
                <CaseDetailPage />
              </ProtectedRoute>
            }
          />
          <Route path="settings" element={<SettingsPage />} />

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

