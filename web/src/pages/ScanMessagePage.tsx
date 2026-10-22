import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquareWarning, Lock } from 'lucide-react'
import { MessageScanForm, type MessageChannel } from '@/components/scan/MessageScanForm'
import { useScanForm } from '@/hooks/useScanForm'
import { ErrorState } from '@/components/common/ErrorState'
import { Card, CardContent } from '@/components/ui/card'

export default function ScanMessagePage() {
  const navigate = useNavigate()
  const { scanMessage, status, error, reset } = useScanForm()

  const handleScan = async (
    message: string,
    channel: MessageChannel,
    options: { use_ai: boolean; persist: boolean }
  ) => {
    const report = await scanMessage(message, channel, options)
    if (report) {
      navigate(`/reports/${report.report_id}`)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-2 md:py-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
          <MessageSquareWarning className="h-4 w-4" />
          <span>Social Engineering & Scam Analysis</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Analyze Suspicious Message
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Inspects SMS, email snippets, or chat messages for urgency pressures, authority impersonation, financial lures, and embedded links.
        </p>
      </div>

      {error && (
        <ErrorState error={error} onRetry={reset} />
      )}

      <Card className="border-border/60 bg-card/80 shadow-md">
        <CardContent className="p-6">
          <MessageScanForm
            onSubmit={handleScan}
            isSubmitting={status === 'submitting'}
          />
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <div className="rounded-lg border border-border/40 bg-muted/30 p-4 space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Lock className="h-4 w-4 text-primary" />
          <span>Data Handling & Privacy Safeguards</span>
        </div>
        <ul className="list-disc list-inside space-y-1 pl-1 leading-relaxed">
          <li>Do not include sensitive passwords or financial credentials in submissions.</li>
          <li>Scanned messages are evaluated in-memory for pattern heuristics.</li>
          <li>All displayed message fragments are rendered strictly as unformatted text.</li>
        </ul>
      </div>
    </div>
  )
}
