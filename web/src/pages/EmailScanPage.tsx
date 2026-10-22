import React, { useState, useRef } from 'react'
import { Mail, Upload, FileText, Lock, Shield, AlertCircle } from 'lucide-react'
import { ThreatReport } from '@/types/threat-report'
import { ThreatReportView } from '@/components/report/ThreatReportView'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function EmailScanPage() {
  const [mode, setMode] = useState<'text' | 'file'>('file')
  const [rawEmail, setRawEmail] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [includeReputation, setIncludeReputation] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [report, setReport] = useState<ThreatReport | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setErrorMsg(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
      setErrorMsg(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (mode === 'text' && !rawEmail.trim()) {
      setErrorMsg('Please paste raw email headers and body text.')
      return
    }
    if (mode === 'file' && !file) {
      setErrorMsg('Please upload a .eml file to analyze.')
      return
    }

    setIsSubmitting(true)
    try {
      let res: Response
      if (mode === 'file' && file) {
        const formData = new FormData()
        formData.append('file', file)
        res = await fetch('/api/v1/scans/email', {
          method: 'POST',
          body: formData,
        })
      } else {
        res = await fetch('/api/v1/scans/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            raw_email: rawEmail,
            include_reputation: includeReputation,
          }),
        })
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.error?.message || errData?.detail || `Email scan failed (${res.status}).`)
      }

      const threatReport: ThreatReport = await res.json()
      setReport(threatReport)
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while inspecting the email.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setReport(null)
    setFile(null)
    setRawEmail('')
    setErrorMsg(null)
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2 md:py-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
          <Mail className="h-4 w-4" />
          <span>Full Email Forensics & Phishing Audit</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Analyze Suspicious Email (.eml)
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Deep analysis of RFC 822 / MIME emails: SPF/DKIM/DMARC routing audit, display name brand impersonation, deceptive link detection, and executable attachment inspection.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-start gap-2.5 max-w-2xl">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-rose-200">Scan Error</span>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {!report && (
        <Card className="border-border/60 bg-card/80 shadow-md max-w-2xl">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-border/40 pb-4">
              <button
                type="button"
                onClick={() => setMode('file')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  mode === 'file'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary/60 hover:bg-secondary text-muted-foreground'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload .EML File
              </button>
              <button
                type="button"
                onClick={() => setMode('text')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  mode === 'text'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary/60 hover:bg-secondary text-muted-foreground'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Paste Raw Headers & Body
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'file' ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border/60 hover:border-primary/50 bg-background/40 hover:bg-background/60 transition-all rounded-xl p-8 text-center cursor-pointer flex flex-col items-center justify-center gap-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".eml,message/rfc822"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="p-3 rounded-full bg-primary/10 text-primary border border-primary/20">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {file ? file.name : 'Click to select or drag and drop an .eml file'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {file
                        ? `${(file.size / 1024).toFixed(1)} KB selected`
                        : 'Standard exported email files up to 1 MB'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Raw Email RFC822 Source</label>
                  <textarea
                    rows={8}
                    value={rawEmail}
                    onChange={(e) => setRawEmail(e.target.value)}
                    placeholder="From: Security <service@bank.com>&#10;To: victim@example.com&#10;Subject: Action required&#10;&#10;Please verify your account immediately at http://..."
                    className="w-full rounded-lg border border-border/60 bg-background/60 p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeReputation}
                    onChange={(e) => setIncludeReputation(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  Query external threat reputation on embedded links
                </label>

                <Button
                  type="submit"
                  disabled={isSubmitting || (mode === 'file' && !file) || (mode === 'text' && !rawEmail.trim())}
                  className="font-semibold text-xs"
                >
                  {isSubmitting ? 'Inspecting Email...' : 'Inspect Email'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {report && (
        <div className="pt-2 animate-in fade-in duration-300">
          <ThreatReportView report={report} onScanAgain={handleReset} />
        </div>
      )}

      {!report && (
        <div className="rounded-lg border border-border/40 bg-muted/30 p-4 space-y-2 text-xs text-muted-foreground max-w-2xl">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Lock className="h-3.5 w-3.5 text-emerald-500" />
            <span>Privacy & Air-Gapped Security Guarantee</span>
          </div>
          <p>
            Attachments are audited only for safe MIME structures, script flags, and hashes. Executable binaries are never executed. Email bodies are sanitized before processing.
          </p>
        </div>
      )}
    </div>
  )
}
