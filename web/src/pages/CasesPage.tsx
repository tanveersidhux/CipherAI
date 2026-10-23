/**
 * Investigation Cases Page for CIPHER AI.
 * Allows analysts to create, manage, and filter security investigation dossiers.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { FolderLock, Plus, Filter, Loader2, ShieldAlert, Clock } from 'lucide-react'
import { useCipherApi } from '@/lib/api/client'
import type { CasePriority, CaseResponse } from '@/types/cases'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { EmptyState } from '@/components/common/EmptyState'

export default function CasesPage() {
  const api = useCipherApi()
  const [cases, setCases] = useState<CaseResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState<CasePriority>('medium')
  const [creating, setCreating] = useState(false)

  const fetchCases = useCallback(async () => {
    if (!api.listCases) return
    setLoading(true)
    try {
      const res = await api.listCases({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 50,
      })
      setCases(res.items)
    } catch {
      // Empty or error state handled in UI
    } finally {
      setLoading(false)
    }
  }, [api, statusFilter])

  useEffect(() => {
    fetchCases()
  }, [fetchCases])

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !api.createCase) return

    setCreating(true)
    try {
      const created = await api.createCase({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        priority: newPriority,
      })
      setCases((prev) => [created, ...prev])
      setNewTitle('')
      setNewDesc('')
      setNewPriority('medium')
      setIsCreateOpen(false)
    } finally {
      setCreating(false)
    }
  }

  const getPriorityBadgeVariant = (p: CasePriority): 'destructive' | 'secondary' | 'outline' => {
    switch (p) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'secondary'
      case 'low':
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-6 py-2 md:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
            <FolderLock className="h-4 w-4" />
            <span>Threat Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Investigation Cases
          </h1>
          <p className="text-sm text-muted-foreground">
            Dossiers grouping suspicious targets, analyst notes, and audit timelines.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              New Investigation Case
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Investigation Case</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Initialize a dedicated dossier to correlate multiple threat scans and notes.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateCase} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label htmlFor="create-case-title" className="text-xs font-medium text-foreground">
                  Case Title <span className="text-destructive">*</span>
                </label>
                <Input
                  id="create-case-title"
                  required
                  maxLength={120}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Incident #204 - Executive Phishing Campaign"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="create-case-desc" className="text-xs font-medium text-foreground">
                  Description
                </label>
                <textarea
                  id="create-case-desc"
                  rows={3}
                  maxLength={2000}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Summary of threat vector, targets involved, and preliminary findings..."
                  className="w-full rounded-md border border-input bg-background p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="create-case-priority" className="text-xs font-medium text-foreground">
                  Priority Tier
                </label>
                <select
                  id="create-case-priority"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as CasePriority)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={creating} className="h-8 text-xs gap-1.5">
                  {creating && <Loader2 className="h-3 w-3 animate-spin" />}
                  Create Case
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center gap-3 bg-card/60 p-3 rounded-lg border border-border/50">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All Cases</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-8 space-y-4">
          <LoadingSkeleton variant="table" />
        </div>
      ) : cases.length === 0 ? (
        <EmptyState
          icon={FolderLock}
          title="No Investigation Cases Found"
          description="Create your first case dossier or save a completed scan to organize findings."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((c) => (
            <Link key={c.id} to={`/cases/${c.id}`} className="block group">
              <Card className="h-full border-border/60 hover:border-primary/50 transition-all hover:shadow-md bg-card/80 flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant={getPriorityBadgeVariant(c.priority)} className="uppercase text-[10px]">
                      {c.priority} Priority
                    </Badge>
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {c.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-1">
                    {c.title}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-2">
                    {c.description || 'No description provided.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0 border-t border-border/40 text-xs text-muted-foreground flex items-center justify-between mt-auto py-3">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>{c.scan_count} attached scans</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px]">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(c.updated_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
