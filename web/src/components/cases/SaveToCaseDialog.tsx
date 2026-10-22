/**
 * Save-to-Case dialog allowing analysts to add a scan report to an existing or new investigation case.
 */

import React, { useState, useEffect } from 'react'
import { FolderPlus, Plus, Loader2, Check } from 'lucide-react'
import { useCipherApi } from '@/lib/api/client'
import type { CaseResponse } from '@/types/cases'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'

interface SaveToCaseDialogProps {
  scanId: string
  onAttached?: (caseId: string) => void
}

export function SaveToCaseDialog({ scanId, onAttached }: SaveToCaseDialogProps) {
  const api = useCipherApi()
  const [open, setOpen] = useState(false)
  const [cases, setCases] = useState<CaseResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [attachingId, setAttachingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [attachedCaseIds, setAttachedCaseIds] = useState<Set<string>>(new Set())
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    if (open && api.listCases) {
      setLoading(true)
      api
        .listCases({ limit: 50 })
        .then((res) => {
          setCases(res.items)
          setLoading(false)
        })
        .catch(() => {
          setLoading(false)
        })
    }
  }, [open, api])

  const handleAttach = async (caseId: string) => {
    if (!api.attachScan) return
    setAttachingId(caseId)
    setStatusMsg(null)
    try {
      await api.attachScan(caseId, scanId)
      setAttachedCaseIds((prev) => new Set([...prev, caseId]))
      setStatusMsg('Scan attached to case successfully!')
      onAttached?.(caseId)
    } catch {
      setStatusMsg('Scan is already attached or could not be linked.')
    } finally {
      setAttachingId(null)
    }
  }

  const handleCreateAndAttach = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !api.createCase) return

    setLoading(true)
    setStatusMsg(null)
    try {
      const created = await api.createCase({
        title: newTitle.trim(),
        scan_ids: [scanId],
      })
      setCases((prev) => [created, ...prev])
      setAttachedCaseIds((prev) => new Set([...prev, created.id]))
      setNewTitle('')
      setIsCreating(false)
      setStatusMsg(`Created and attached to "${created.title}"!`)
      onAttached?.(created.id)
    } catch {
      setStatusMsg('Failed to create new case.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <FolderPlus className="h-3.5 w-3.5" />
          Save to Case
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Save Threat Scan to Case</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Group this scan with related indicators and investigation dossiers.
          </DialogDescription>
        </DialogHeader>

        {statusMsg && (
          <div className="p-2.5 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
            {statusMsg}
          </div>
        )}

        <div className="space-y-4 py-2">
          {!isCreating ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Select an open case:</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreating(true)}
                  className="h-7 text-xs gap-1 text-primary hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                  New Case
                </Button>
              </div>

              {loading ? (
                <div className="py-6 flex justify-center text-muted-foreground text-xs">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading cases...
                </div>
              ) : cases.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground border border-dashed rounded-md p-4">
                  No cases found. Create your first investigation case to group threats.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {cases.map((c) => {
                    const isAttached = attachedCaseIds.has(c.id)
                    const isBusy = attachingId === c.id

                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-2.5 rounded-md border border-border/60 hover:bg-muted/40 transition-colors text-xs"
                      >
                        <div className="truncate mr-2">
                          <p className="font-medium text-foreground truncate">{c.title}</p>
                          <span className="text-[10px] text-muted-foreground capitalize">
                            Status: {c.status} • {c.scan_count} scans
                          </span>
                        </div>

                        <Button
                          size="sm"
                          variant={isAttached ? 'secondary' : 'default'}
                          disabled={isAttached || isBusy}
                          onClick={() => handleAttach(c.id)}
                          className="h-7 text-xs shrink-0"
                        >
                          {isBusy ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : isAttached ? (
                            <>
                              <Check className="h-3 w-3 mr-1 text-success" />
                              Attached
                            </>
                          ) : (
                            'Attach'
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleCreateAndAttach} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="case-title" className="text-xs font-medium text-foreground">
                  Case Title
                </label>
                <Input
                  id="case-title"
                  required
                  placeholder="e.g. Incident #102 - Phishing Spike"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="text-xs h-9"
                  maxLength={120}
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreating(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading} className="h-8 text-xs gap-1.5">
                  {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                  Create & Attach
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
