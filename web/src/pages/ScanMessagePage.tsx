import React, { useState } from 'react'
import { MessageSquareWarning, Lock } from 'lucide-react'
import { MessageScanForm, type MessageChannel } from '@/components/scan/MessageScanForm'
import { useMessageScan } from '@/hooks/useScan'
import { ErrorAlert } from '@/components/common/ErrorAlert'
import { ThreatReportView } from '@/components/report/ThreatReportView'
import { Card, CardContent } from '@/components/ui/card'

export default function ScanMessagePage() {
  const { run, status, data: report, error, reset } = useMessageScan()
  const [submittedMessage, setSubmittedMessage] = useState('')
  const [submittedChannel, setSubmittedChannel] = useState<MessageChannel>('sms')

  const handleScan = async (
    message: string,
    channel: MessageChannel,
    options: { use_ai: boolean; persist: boolean }
  ) => {
    setSubmittedMessage(message)
    setSubmittedChannel(channel)
    await run({ message, channel, options })
  }

  const handleScanAgain = () => {
    reset()
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2 md:py-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
          <MessageSquareWarning className="h-4 w-4" />
          <span>Social Engineering & Scam Analysis</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Analyze Suspicious Message
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Inspects SMS, email snippets, or chat messages for urgency pressures, authority impersonation, financial lures, and embedded links.
        </p>
      </div>

      {error && (
        <ErrorAlert
          error={error}
          onRetry={() =>
            submittedMessage &&
            handleScan(submittedMessage, submittedChannel, { use_ai: true, persist: true })
          }
        />
      )}

      {/* Primary Scan Input Card */}
      {!report && (
        <Card className="border-border/60 bg-card/80 shadow-md max-w-2xl">
          <CardContent className="p-6">
            <MessageScanForm
              onSubmit={handleScan}
              isSubmitting={status === 'loading'}
              initialValue={submittedMessage}
            />
          </CardContent>
        </Card>
      )}

      {/* Render ThreatReport Inline Below Form Without Full Page Navigation */}
      {report && (
        <div className="pt-2 animate-in fade-in duration-300">
          <ThreatReportView report={report} onScanAgain={handleScanAgain} />
        </div>
      )}

      {/* Privacy Notice */}
      {!report && (
        <div className="rounded-lg border border-border/40 bg-muted/30 p-4 space-y-2 text-xs text-muted-foreground max-w-2xl">
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
      )}
    </div>
  )
}
