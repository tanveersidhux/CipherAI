/**
 * Protected Route wrapper redirecting unauthenticated users to the Login page.
 */

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'

export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="py-12 max-w-4xl mx-auto p-6 space-y-4">
        <LoadingSkeleton variant="report" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children ? <>{children}</> : null
}
