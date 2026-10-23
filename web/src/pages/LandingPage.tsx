import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ScanInputCard } from '@/components/scan/ScanInputCard'
import { TRUST_CARDS, APP_TAGLINE, APP_SUBTITLE } from '@/lib/content/wording'
import { useScanForm } from '@/hooks/useScanForm'
import { useScanHistory } from '@/hooks/useScanHistory'
import { RiskBadge } from '@/components/report/RiskBadge'
import { ShieldCheck, ArrowRight, History, Sparkles, Zap, CheckCircle2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ErrorAlert } from '@/components/common/ErrorAlert'

const AI_SHOWCASE_SAMPLES = [
  {
    title: 'Deceptive Credential Harvesting',
    type: 'URL Phish',
    target: 'https://security-verify.paypa1-alert.com/auth/login',
    summary:
      'The inspected destination utilizes a punycode-substituted homoglyph domain mimicking PayPal services combined with an unauthenticated credential submission form. This is a severe credential theft lure engineered to harvest primary authentication secrets.',
    risk: 'Critical Threat (96/100)',
    latency: '1.42s',
    indicators: ['#homoglyph_typo', '#unencrypted_auth', '#brand_impersonation'],
    actions: [
      { priority: 'high', text: 'Do NOT input credentials or OTP codes on this domain.' },
      { priority: 'medium', text: 'Block domain on internal DNS and secure mail gateways.' },
    ],
  },
  {
    title: 'Urgent Wire Transfer & Extortion',
    type: 'Message Scam',
    target: 'URGENT: CEO authorization required for pending $48,500 swift wire release by 14:00 today...',
    summary:
      'High-velocity business email compromise (BEC) lure impersonating executive leadership. Demonstrates artificial time urgency and bypasses standard multi-stakeholder financial approval workflows.',
    risk: 'High Threat (82/100)',
    latency: '1.87s',
    indicators: ['#urgency_extortion', '#executive_spoof', '#financial_diversion'],
    actions: [
      { priority: 'high', text: 'Verify transfer request out-of-band via phone or voice verification.' },
      { priority: 'medium', text: 'Report message to SOC / Fraud operations team immediately.' },
    ],
  },
  {
    title: 'Suspicious IP Host Masquerade',
    type: 'URL Inspection',
    target: 'http://198.51.100.42:8080/portal/update-billing.php',
    summary:
      'Target bypasses standard DNS resolution by routing traffic directly to an exposed raw IP address and non-standard HTTP port. Exhibits hallmarks of automated scanning command infrastructure.',
    risk: 'High Threat (78/100)',
    latency: '1.24s',
    indicators: ['#raw_ip_host', '#non_standard_port', '#untrusted_asn'],
    actions: [
      { priority: 'high', text: 'Isolate host communication and inspect active session logs.' },
      { priority: 'medium', text: 'Block outbound traffic to port 8080 on the designated CIDR.' },
    ],
  },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { scanUrl, scanMessage, status, error } = useScanForm()
  const { items: recentScans } = useScanHistory()
  const [selectedAiSampleIdx, setSelectedAiSampleIdx] = React.useState(0)
  const activeAiSample = AI_SHOWCASE_SAMPLES[selectedAiSampleIdx]

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
      <section className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Deterministic Heuristic Engine</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Powered by Gemini 3.5 Flash Heavy AI</span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
          {APP_TAGLINE}
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {APP_SUBTITLE}
        </p>
      </section>

      {/* Immediate Quick-Scan Entry */}
      <section aria-label="Quick Scan Input" className="max-w-2xl mx-auto space-y-4">
        {error && (
          <ErrorAlert
            error={error}
          />
        )}
        <ScanInputCard
          onScanUrl={handleScanUrl}
          onScanMessage={handleScanMessage}
          isSubmitting={status === 'submitting'}
        />
      </section>

      {/* Interactive AI-Powered Threat Intelligence Showcase */}
      <section
        aria-labelledby="ai-showcase-heading"
        className="rounded-xl border border-primary/25 bg-card/75 p-6 md:p-8 space-y-6 shadow-md backdrop-blur-md"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span>Real-Time AI Threat Synthesis</span>
            </div>
            <h2 id="ai-showcase-heading" className="text-lg sm:text-xl font-bold text-foreground">
              What Gemini 3.5 Flash Delivers
            </h2>
            <p className="text-xs text-muted-foreground">
              Deep reasoning combines raw structural heuristics with conversational intelligence and evidence grounding.
            </p>
          </div>

          {/* Sample Selector Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {AI_SHOWCASE_SAMPLES.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedAiSampleIdx(idx)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                  selectedAiSampleIdx === idx
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {sample.type}
              </button>
            ))}
          </div>
        </div>

        {/* Live Sample Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-3.5 rounded-lg border border-border/50 bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase font-bold text-primary">
                {activeAiSample.type}
              </span>
              <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-600 dark:text-red-400">
                {activeAiSample.risk}
              </Badge>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Analyzed Input:</span>
              <p className="font-mono text-xs text-foreground bg-card p-2.5 rounded border border-border/40 break-all select-all mt-1">
                {activeAiSample.target}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Triggered Heuristics:</span>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {activeAiSample.indicators.map((ind) => (
                  <span
                    key={ind}
                    className="font-mono text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded"
                  >
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4 rounded-lg border border-primary/20 bg-card/90 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-primary/15 flex items-center justify-center text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-foreground">
                  Google Gemini 3.5 Flash Reasoning
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-primary flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {activeAiSample.latency}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Grounded
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Plain-Language Executive Summary
              </span>
              <p className="text-xs text-foreground leading-relaxed font-sans bg-muted/20 p-3 rounded border border-border/30">
                {activeAiSample.summary}
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Recommended Actions
              </span>
              <div className="space-y-1.5">
                {activeAiSample.actions.map((act, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-xs bg-card p-2 rounded border border-border/40"
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground leading-snug">{act.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
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
