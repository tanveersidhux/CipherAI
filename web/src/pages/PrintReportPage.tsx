import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Shield, Printer, ArrowLeft } from 'lucide-react'
import { ThreatReport } from '@/types/threat-report'
import { Button } from '@/components/ui/button'

export default function PrintReportPage() {
  const { scanId } = useParams<{ scanId: string }>()
  const [report, setReport] = useState<ThreatReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!scanId) return
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/v1/scans/${scanId}`)
        if (res.ok) {
          const data = await res.json()
          setReport(data)
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [scanId])

  useEffect(() => {
    if (report) {
      const timer = setTimeout(() => {
        window.print()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [report])

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground">Preparing printable report...</div>
  }

  if (!report) {
    return <div className="p-8 text-center text-xs text-rose-400">Threat report not found.</div>
  }

  return (
    <div className="bg-white text-slate-900 p-8 max-w-4xl mx-auto space-y-6 print:p-0 print:m-0 print:text-black">
      {/* Top action bar - hidden during print */}
      <div className="flex items-center justify-between border-b pb-4 print:hidden">
        <Link
          to={`/reports/${scanId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Assessment
        </Link>
        <Button size="sm" onClick={() => window.print()} className="text-xs gap-1.5">
          <Printer className="w-3.5 h-3.5" /> Print Now / Save PDF
        </Button>
      </div>

      {/* Printable Report Header */}
      <div className="flex items-start justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">CIPHER AI Security Assessment</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">Autonomous Threat Intelligence & Forensic Heuristic Audit</p>
        </div>
        <div className="text-right text-xs text-slate-500 font-mono">
          <p>Scan ID: {report.scan_id || report.report_id}</p>
          <p>{new Date(report.created_at).toUTCString()}</p>
        </div>
      </div>

      {/* Target & Score Summary */}
      <div className="grid grid-cols-3 gap-4 border p-4 rounded-lg bg-slate-50 print:bg-transparent">
        <div className="col-span-2 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Inspected Target</span>
          <p className="font-mono text-xs font-semibold text-slate-900 break-all">{report.input.display_value}</p>
          <p className="text-[10px] text-slate-500">Scan Type: {report.scan_type.toUpperCase()}</p>
        </div>
        <div className="text-right space-y-1 border-l pl-4">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Risk Evaluation</span>
          <p className="text-2xl font-black text-slate-900">{report.assessment.risk_score} / 100</p>
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">{report.assessment.risk_level}</p>
        </div>
      </div>

      {/* AI Explanation Summary */}
      {report.ai_explanation && (
        <div className="border p-4 rounded-lg space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Advisory Assessment Summary</h2>
          <p className="text-xs text-slate-800 leading-relaxed">{report.ai_explanation.summary}</p>
          {report.ai_explanation.user_guidance && (
            <p className="text-xs text-slate-600 font-medium pt-1">
              <strong>Guidance:</strong> {report.ai_explanation.user_guidance}
            </p>
          )}
        </div>
      )}

      {/* Observable Indicators */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Forensic Indicators Detected ({report.indicators.filter((i) => i.triggered).length})
        </h2>
        <table className="w-full text-left text-xs border-collapse border border-slate-200">
          <thead>
            <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold">
              <th className="p-2 border">Severity</th>
              <th className="p-2 border">Indicator</th>
              <th className="p-2 border">Observed Evidence</th>
            </tr>
          </thead>
          <tbody>
            {report.indicators
              .filter((i) => i.triggered)
              .map((ind, idx) => (
                <tr key={idx} className="border-b">
                  <td className="p-2 border font-bold uppercase text-[10px]">{ind.severity}</td>
                  <td className="p-2 border font-medium">{ind.title}</td>
                  <td className="p-2 border text-slate-600 text-[11px]">{ind.observed_value || ind.description}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Disclaimer */}
      <div className="border-t pt-4 text-[10px] text-slate-500 space-y-1">
        <p className="font-semibold uppercase tracking-wider text-slate-600">Automated Security Disclaimer</p>
        <p>
          This threat evaluation was deterministically generated by CIPHER AI based on observed heuristics and external threat feeds at the time of inspection. Malicious campaigns may evolve or evade detection.
        </p>
      </div>
    </div>
  )
}
