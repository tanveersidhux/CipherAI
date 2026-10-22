import React, { useState } from 'react'
import { Link2, Lock } from 'lucide-react'
import { UrlScanForm } from '@/components/scan/UrlScanForm'
import { useUrlScan } from '@/hooks/useScan'
import { ErrorAlert } from '@/components/common/ErrorAlert'
import { ThreatReportView } from '@/components/report/ThreatReportView'
import { Card, CardContent } from '@/components/ui/card'

export default function ScanUrlPage() {
  const { run, status, data: report, error, reset } = useUrlScan()
  const [submittedUrl, setSubmittedUrl] = useState('')

  const handleScan = async (
    url: string,
    options: { use_ai: boolean; persist: boolean }
  ) => {
    setSubmittedUrl(url)
    await run({ url, options })
  }

  const handleScanAgain = () => {
    reset()
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2 md:py-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
          <Link2 className="h-4 w-4" />
          <span>URL Security Inspection</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Analyze Suspicious Web Address
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Examines lexical structures, IP host masks, custom ports, subdomains, and homoglyphs. No outbound HTTP requests are made.
        </p>
      </div>

      {error && (
        <ErrorAlert
          error={error}
          onRetry={() => submittedUrl && handleScan(submittedUrl, { use_ai: true, persist: true })}
        />
      )}

      {/* Primary Scan Input Card */}
      {!report && (
        <Card className="border-border/60 bg-card/80 shadow-md max-w-2xl">
          <CardContent className="p-6">
            <UrlScanForm
              onSubmit={handleScan}
              isSubmitting={status === 'loading'}
              initialValue={submittedUrl}
              autoFocus
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

      {/* Privacy and Operational Disclosure */}
      {!report && (
        <div className="rounded-lg border border-border/40 bg-muted/30 p-4 space-y-2 text-xs text-muted-foreground max-w-2xl">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Lock className="h-4 w-4 text-primary" />
            <span>Safe by Default & Privacy Invariant</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1 leading-relaxed">
            <li>Submitted URLs are sanitized and displayed defanged (<code className="font-mono text-[11px]">hxxps://...</code>).</li>
            <li>CIPHER AI never visits, renders, or executes target web pages in the browser.</li>
            <li>Scans are associated with your anonymous session and never sold or shared.</li>
          </ul>
        </div>
      )}
    </div>
  )
}
