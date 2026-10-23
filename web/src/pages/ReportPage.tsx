import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useCipherApi } from '@/lib/api/client'
import { useScanSession } from '@/context/ScanSessionProvider'
import type { ThreatReport } from '@/types/threat-report'
import { ApiError } from '@/lib/api/errors'
import { ThreatReportView } from '@/components/report/ThreatReportView'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { Button } from '@/components/ui/button'

export default function ReportPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const api = useCipherApi()
  const session = useScanSession()

  const [report, setReport] = useState<ThreatReport | null>(() => {
    return reportId ? session.getScanReport(reportId) || null : null
  })
  const [loading, setLoading] = useState<boolean>(() => {
    return reportId ? !session.getScanReport(reportId) : true
  })
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    if (!reportId || report) return
    let isMounted = true

    api
      .getScan(reportId)
      .then((data) => {
        if (isMounted) {
          setReport(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (err instanceof ApiError && (err.code === 'UNAUTHENTICATED' || err.status === 401 || err.http_status === 401)) {
            setError(
              new ApiError(
                'NOT_FOUND',
                'Threat report not found or requires sign-in to access saved historical scans.',
                [],
                err.request_id || 'guest_unauth_trace',
                404
              )
            )
          } else {
            setError(
              err instanceof ApiError
                ? err
                : new ApiError('NOT_FOUND', 'Threat report not found.')
            )
          }
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [reportId, api, report])

  if (loading) {
    return <LoadingSkeleton variant="report" className="py-6 max-w-4xl mx-auto" />
  }

  if (error || !report) {
    return (
      <div className="py-12 max-w-md mx-auto">
        <ErrorState error={error} />
        <div className="text-center mt-6">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Homepage
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link
          to="/history"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Scans</span>
        </Link>
      </div>

      <ThreatReportView report={report} />
    </div>
  )
}
