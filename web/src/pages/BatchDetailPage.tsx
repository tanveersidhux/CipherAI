import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Layers, ArrowLeft, RefreshCw, XCircle, CheckCircle, Clock, ExternalLink, Ban } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface BatchItem {
  item_id: string
  batch_id: string
  input_url: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  scan_id?: string | null
  risk_score?: number | null
  risk_level?: string | null
  error_message?: string | null
}

interface BatchStatus {
  batch_id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'partial_failed' | 'cancelled'
  total_items: number
  completed_items: number
  failed_items: number
  created_at: string
}

export default function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>()
  const [batch, setBatch] = useState<BatchStatus | null>(null)
  const [items, setItems] = useState<BatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchStatus = async () => {
    if (!batchId) return
    try {
      const [batchRes, itemsRes] = await Promise.all([
        fetch(`/api/v1/batches/${batchId}`),
        fetch(`/api/v1/batches/${batchId}/items`),
      ])
      if (batchRes.ok) {
        const bData = await batchRes.json()
        setBatch(bData)
      }
      if (itemsRes.ok) {
        const iData = await itemsRes.json()
        setItems(iData.items || [])
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error fetching batch status.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const isTerminal = batch && ['completed', 'partial_failed', 'cancelled'].includes(batch.status)
    if (isTerminal) return

    const timer = setInterval(fetchStatus, 2000)
    return () => clearInterval(timer)
  }, [batchId, batch?.status])

  const handleCancel = async () => {
    if (!batchId) return
    setCancelling(true)
    try {
      await fetch(`/api/v1/batches/${batchId}/cancel`, { method: 'POST' })
      await fetchStatus()
    } catch {
      // Ignore
    } finally {
      setCancelling(false)
    }
  }

  const progressPercent = batch && batch.total_items > 0
    ? Math.round(((batch.completed_items + batch.failed_items) / batch.total_items) * 100)
    : 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2 md:py-6">
      <div className="flex items-center justify-between">
        <Link
          to="/batches"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Batch Scanning
        </Link>
        {batch && ['pending', 'running'].includes(batch.status) && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={cancelling}
            className="text-xs text-rose-400 hover:text-rose-300 border-rose-500/30 hover:bg-rose-500/10"
          >
            <Ban className="w-3.5 h-3.5 mr-1" />
            Cancel Batch
          </Button>
        )}
      </div>

      {batch && (
        <Card className="border-border/60 bg-card/85 shadow-md">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-foreground">{batch.name}</h1>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {batch.batch_id}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  batch.status === 'completed'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : batch.status === 'cancelled'
                    ? 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                    : batch.status === 'partial_failed'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 animate-pulse'
                }`}
              >
                {batch.status.replace('_', ' ')}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress: {progressPercent}%</span>
                <span>
                  {batch.completed_items + batch.failed_items} / {batch.total_items} processed
                </span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Items List */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Inspected URLs ({items.length})
        </h2>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.item_id}
              className="flex items-center justify-between p-3.5 rounded-lg border border-border/50 bg-card/60 backdrop-blur-sm gap-4 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-foreground truncate">{item.input_url}</p>
                {item.error_message && (
                  <p className="text-[11px] text-rose-400 mt-0.5">{item.error_message}</p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {item.risk_score !== null && item.risk_score !== undefined && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      item.risk_score >= 60
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : item.risk_score >= 30
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    Score: {item.risk_score}
                  </span>
                )}

                {item.scan_id ? (
                  <Link
                    to={`/reports/${item.scan_id}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                  >
                    View Report <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : (
                  <span className="capitalize text-muted-foreground">{item.status}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
