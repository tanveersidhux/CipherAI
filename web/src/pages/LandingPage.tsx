import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ScanInputCard } from '@/components/scan/ScanInputCard'
import { TRUST_CARDS, APP_TAGLINE, APP_SUBTITLE } from '@/lib/content/wording'
import { useScanForm } from '@/hooks/useScanForm'
import { useScanHistory } from '@/hooks/useScanHistory'
import { RiskBadge } from '@/components/report/RiskBadge'
import { ShieldCheck, ArrowRight, History } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  const navigate = useNavigate()
  const { scanUrl, scanMessage, status } = useScanForm()
  const { items: recentScans } = useScanHistory()

  const handleScanUrl = async (
    url: string,
    options: { use_ai: boolean; persist: boolean }
  ) => {
    const report = await scanUrl(url, options)
    if (report) {
      navigate(`/reports/${report.report_id}`)
    }
  }

  const handleScanMessage = async (
    message: string,
    channel: any,
    options: { use_ai: boolean; persist: boolean }
  ) => {
    const report = await scanMessage(message, channel, options)
    if (report) {
      navigate(`/reports/${report.report_id}`)
    }
  }

  return (
    <div className="space-y-12 py-2 md:py-6">
      {/* Hero Section */}
      <section className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Offline-First Security Analysis</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
          {APP_TAGLINE}
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {APP_SUBTITLE}
        </p>
      </section>

      {/* Immediate Quick-Scan Entry */}
      <section aria-label="Quick Scan Input" className="max-w-2xl mx-auto">
        <ScanInputCard
          onScanUrl={handleScanUrl}
          onScanMessage={handleScanMessage}
          isSubmitting={status === 'submitting'}
        />
      </section>

      {/* Trust & Principles Cards */}
      <section aria-labelledby="trust-cards-heading" className="space-y-4">
        <h2 id="trust-cards-heading" className="sr-only">
          Core CIPHER AI Principles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TRUST_CARDS.map((card, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-border/60 bg-card/60 p-5 space-y-2 backdrop-blur-xs shadow-xs"
            >
              <h3 className="text-sm font-bold text-foreground">{card.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Scans Preview Section */}
      {recentScans.length > 0 && (
        <section aria-labelledby="recent-scans-heading" className="space-y-4 pt-4 border-t border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 id="recent-scans-heading" className="text-sm font-bold text-foreground">
                Recent Scans in This Session
              </h2>
            </div>
            <Link to="/history">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <span>View Full History</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {recentScans.slice(0, 3).map((scan) => (
              <Link
                key={scan.id}
                to={`/reports/${scan.id}`}
                className="group rounded-lg border border-border/60 bg-card/60 p-4 space-y-2.5 hover:border-primary/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono uppercase text-primary font-bold">{scan.scan_type}</span>
                  <span>{new Date(scan.created_at).toLocaleDateString()}</span>
                </div>
                <p className="font-mono text-xs text-foreground truncate group-hover:text-primary transition-colors">
                  {scan.title || scan.input_preview || scan.display_value}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <RiskBadge level={scan.risk_level} size="sm" />
                  <span className="font-mono text-xs font-semibold text-muted-foreground">
                    {scan.risk_score} pts
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
