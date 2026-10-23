import React, { useState } from 'react'
import { Layers } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function BatchesPage() {
  const [urlsText, setUrlsText] = useState('')
  const [batchName, setBatchName] = useState('')
  const [includeReputation, setIncludeReputation] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const rawUrls = urlsText
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean)

    if (rawUrls.length === 0) {
      setErrorMsg('Please enter at least one URL to scan (up to 25 per batch).')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/v1/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: batchName || `Batch Scan (${rawUrls.length} URLs)`,
          urls: rawUrls,
          include_reputation: includeReputation,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || err?.detail || 'Failed to initialize batch scan.')
      }

      const data = await res.json()
      navigate(`/batches/${data.batch_id}`)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating batch job.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2 md:py-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
          <Layers className="h-4 w-4" />
          <span>Automated High-Throughput Intelligence</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Batch URL Threat Scanning
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Execute asynchronous security audits on lists of target URLs (up to 25 items per batch). All URLs are processed with bounded concurrency, strict rate-limiting, and optional external reputation intelligence.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      <Card className="border-border/60 bg-card/80 shadow-md max-w-2xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Batch Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Incident #402 Phishing Domain Sweep"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-foreground">Target URLs (one per line, max 25)</label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {urlsText.split('\n').filter((l) => l.trim()).length} / 25
                </span>
              </div>
              <textarea
                rows={8}
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
                placeholder="https://example1.com&#10;https://example2.com/login&#10;http://suspicious-target.xyz"
                className="w-full rounded-lg border border-border/60 bg-background/60 p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeReputation}
                  onChange={(e) => setIncludeReputation(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                Include threat intelligence provider lookups
              </label>

              <Button type="submit" disabled={isSubmitting} className="font-semibold text-xs">
                {isSubmitting ? 'Starting Batch...' : 'Start Batch Scan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
