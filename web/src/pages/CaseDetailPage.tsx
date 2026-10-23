/**
 * Investigation Case Detail Page.
 * Correlates scans, analyst notes, and audit timeline for a security incident.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  FolderLock,
  ArrowLeft,
  Trash2,
  Plus,
  Unlink,
  MessageSquare,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  FileText,
  Send,
  Edit2,
  Check,
  X,
} from 'lucide-react'
import { useCipherApi } from '@/lib/api/client'
import type {
  CaseDetailResponse,
  CasePriority,
  CaseStatus,
} from '@/types/cases'
import type { ScanSummaryItem } from '@/types/history'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { RiskBadge } from '@/components/common/RiskBadge'
import { DefangedText } from '@/components/common/DefangedText'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { EmptyState } from '@/components/common/EmptyState'

export default function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const api = useCipherApi()

  const [caseData, setCaseData] = useState<CaseDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Edit Header State
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [editedDesc, setEditedDesc] = useState('')

  // New Note State
  const [noteBody, setNoteBody] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editedNoteBody, setEditedNoteBody] = useState('')

  // Attach Scan Dialog State
  const [attachOpen, setAttachOpen] = useState(false)
  const [availableScans, setAvailableScans] = useState<ScanSummaryItem[]>([])
  const [loadingScans, setLoadingScans] = useState(false)
  const [attachingId, setAttachingId] = useState<string | null>(null)

  const fetchCase = useCallback(async () => {
    if (!caseId || !api.getCase) return
    setLoading(true)
    try {
      const data = await api.getCase(caseId)
      setCaseData(data)
      setEditedTitle(data.title)
      setEditedDesc(data.description || '')
    } catch {
      setErrorMsg('Investigation case was not found or has been removed.')
    } finally {
      setLoading(false)
    }
  }, [api, caseId])

  useEffect(() => {
    fetchCase()
  }, [fetchCase])

  const handleUpdateStatus = async (newStatus: CaseStatus) => {
    if (!caseId || !api.updateCase || !caseData) return
    const updated = await api.updateCase(caseId, { status: newStatus })
    setCaseData((prev) => (prev ? { ...prev, status: updated.status } : null))
  }

  const handleUpdatePriority = async (newPriority: CasePriority) => {
    if (!caseId || !api.updateCase || !caseData) return
    const updated = await api.updateCase(caseId, { priority: newPriority })
    setCaseData((prev) => (prev ? { ...prev, priority: updated.priority } : null))
  }

  const handleSaveTitle = async () => {
    if (!caseId || !api.updateCase || !editedTitle.trim()) return
    await api.updateCase(caseId, { title: editedTitle.trim() })
    setCaseData((prev) => (prev ? { ...prev, title: editedTitle.trim() } : null))
    setIsEditingTitle(false)
  }

  const handleSaveDesc = async () => {
    if (!caseId || !api.updateCase) return
    await api.updateCase(caseId, { description: editedDesc.trim() })
    setCaseData((prev) => (prev ? { ...prev, description: editedDesc.trim() } : null))
    setIsEditingDesc(false)
  }

  const handleDeleteCase = async () => {
    if (!caseId || !api.deleteCase) return
    if (window.confirm('Are you sure you want to delete this case? Attached scans will be retained in history.')) {
      await api.deleteCase(caseId)
      navigate('/cases')
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caseId || !api.addNote || !noteBody.trim()) return

    setAddingNote(true)
    try {
      const newNote = await api.addNote(caseId, noteBody.trim())
      setCaseData((prev) =>
        prev
          ? {
              ...prev,
              notes: [...prev.notes, newNote],
              timeline: [
                ...prev.timeline,
                {
                  type: 'note_added',
                  occurred_at: newNote.created_at,
                  reference_id: newNote.id,
                  summary: `Note added (${newNote.body.length} chars)`,
                },
              ],
            }
          : null
      )
      setNoteBody('')
    } finally {
      setAddingNote(false)
    }
  }

  const handleSaveEditNote = async (noteId: string) => {
    if (!caseId || !api.updateNote || !editedNoteBody.trim()) return
    const updated = await api.updateNote(caseId, noteId, editedNoteBody.trim())
    setCaseData((prev) =>
      prev
        ? {
            ...prev,
            notes: prev.notes.map((n) => (n.id === noteId ? updated : n)),
          }
        : null
    )
    setEditingNoteId(null)
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!caseId || !api.deleteNote) return
    await api.deleteNote(caseId, noteId)
    setCaseData((prev) =>
      prev
        ? {
            ...prev,
            notes: prev.notes.filter((n) => n.id !== noteId),
          }
        : null
    )
  }

  const handleOpenAttachDialog = async () => {
    setAttachOpen(true)
    if (!api.listScans) return
    setLoadingScans(true)
    try {
      const res = await api.listScans({ limit: 50 })
      setAvailableScans(res.items)
    } finally {
      setLoadingScans(false)
    }
  }

  const handleAttachScan = async (scanId: string) => {
    if (!caseId || !api.attachScan) return
    setAttachingId(scanId)
    try {
      await api.attachScan(caseId, scanId)
      await fetchCase()
    } finally {
      setAttachingId(null)
    }
  }

  const handleDetachScan = async (scanId: string) => {
    if (!caseId || !api.detachScan) return
    await api.detachScan(caseId, scanId)
    setCaseData((prev) =>
      prev
        ? {
            ...prev,
            scans: prev.scans.filter((s) => s.id !== scanId),
            scan_count: Math.max(0, prev.scan_count - 1),
          }
        : null
    )
  }

  if (loading) {
    return (
      <div className="py-8 max-w-5xl mx-auto space-y-4">
        <LoadingSkeleton variant="report" />
      </div>
    )
  }

  if (errorMsg || !caseData) {
    return (
      <div className="py-12 max-w-md mx-auto text-center space-y-4">
        <EmptyState
          icon={FolderLock}
          title="Case Not Found"
          description={errorMsg || 'Investigation dossier does not exist.'}
        />
        <Link to="/cases">
          <Button variant="outline" size="sm">
            ← Back to Cases
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-2 md:py-6 max-w-6xl mx-auto">
      {/* Navigation & Header */}
      <div>
        <Link
          to="/cases"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>All Investigation Cases</span>
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 bg-card/80 p-5 rounded-xl border border-border/60 shadow-sm">
          <div className="space-y-2 flex-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-lg font-bold h-9"
                  maxLength={120}
                />
                <Button size="icon" variant="ghost" onClick={handleSaveTitle} className="h-9 w-9">
                  <Check className="h-4 w-4 text-success" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(false)} className="h-9 w-9">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {caseData.title}
                </h1>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsEditingTitle(true)}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Rename Case"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {isEditingDesc ? (
              <div className="space-y-2">
                <textarea
                  value={editedDesc}
                  onChange={(e) => setEditedDesc(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  className="w-full text-xs rounded-md border border-input bg-background p-2"
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleSaveDesc} className="h-7 text-xs">
                    Save Description
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingDesc(false)} className="h-7 text-xs">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p
                onClick={() => setIsEditingDesc(true)}
                className="text-xs text-muted-foreground cursor-pointer hover:text-foreground/90 transition-colors"
                title="Click to edit description"
              >
                {caseData.description || 'Add case overview or scope...'}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
              <span>Created {new Date(caseData.created_at).toLocaleString()}</span>
              <span>•</span>
              <span>Updated {new Date(caseData.updated_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={caseData.status}
              onChange={(e) => handleUpdateStatus(e.target.value as CaseStatus)}
              className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground"
              aria-label="Change status"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={caseData.priority}
              onChange={(e) => handleUpdatePriority(e.target.value as CasePriority)}
              className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground"
              aria-label="Change priority"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteCase}
              className="h-8 text-xs gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Case
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="scans" className="space-y-4">
        <TabsList className="bg-card border border-border/60">
          <TabsTrigger value="scans" className="gap-2 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            Attached Scans ({caseData.scans.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2 text-xs">
            <MessageSquare className="h-3.5 w-3.5" />
            Analyst Notes ({caseData.notes.length})
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2 text-xs">
            <Clock className="h-3.5 w-3.5" />
            Audit Timeline ({caseData.timeline.length})
          </TabsTrigger>
        </TabsList>

        {/* --- SCANS TAB --- */}
        <TabsContent value="scans" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Scans Attached to this Dossier</h2>
            <Button size="sm" onClick={handleOpenAttachDialog} className="gap-1.5 h-8 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Attach Scan
            </Button>
          </div>

          {caseData.scans.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="No Scans Attached"
              description="Attach completed scans from your history to correlate indicators and evidence."
            />
          ) : (
            <div className="space-y-2">
              {caseData.scans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-border/60 bg-card/80 hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground truncate">{scan.title}</span>
                      <RiskBadge level={scan.risk_level} size="sm" />
                      <span className="font-mono text-[11px] text-muted-foreground">{scan.risk_score} pts</span>
                    </div>
                    {scan.scan_type === 'url' ? (
                      <DefangedText url={scan.input_preview} />
                    ) : (
                      <p className="text-xs text-muted-foreground font-mono bg-muted/40 px-2 py-0.5 rounded border border-border/40 truncate">
                        "{scan.input_preview}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link to={`/reports/${scan.id}`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        View Report
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDetachScan(scan.id)}
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      title="Detach scan from case"
                    >
                      <Unlink className="h-3.5 w-3.5 mr-1" />
                      Detach
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* --- NOTES TAB --- */}
        <TabsContent value="notes" className="space-y-4">
          <form onSubmit={handleAddNote} className="space-y-2 bg-card/80 p-4 rounded-lg border border-border/60">
            <label htmlFor="note-textarea" className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Append Plain-Text Investigation Note</span>
              <span className="text-[11px] font-normal text-muted-foreground">{noteBody.length} / 5000 characters</span>
            </label>
            <textarea
              id="note-textarea"
              required
              rows={3}
              maxLength={5000}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Record forensic observations, threat actor attribution, or mitigation actions taken..."
              className="w-full text-xs rounded-md border border-input bg-background p-2.5 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={addingNote || !noteBody.trim()} className="h-8 text-xs gap-1.5">
                {addingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Add Note
              </Button>
            </div>
          </form>

          {caseData.notes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Investigation Notes"
              description="Add timestamped notes above to record your analysis."
            />
          ) : (
            <div className="space-y-3">
              {caseData.notes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-lg border border-border/60 bg-card/60 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(note.created_at).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingNoteId(note.id)
                          setEditedNoteBody(note.body)
                        }}
                        className="h-6 px-2 text-[11px]"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                        className="h-6 px-2 text-[11px] text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {editingNoteId === note.id ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={editedNoteBody}
                        onChange={(e) => setEditedNoteBody(e.target.value)}
                        rows={3}
                        maxLength={5000}
                        className="w-full text-xs rounded-md border border-input bg-background p-2"
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleSaveEditNote(note.id)} className="h-7 text-xs">
                          Save Note
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingNoteId(null)} className="h-7 text-xs">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed select-text font-sans">
                      {note.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* --- TIMELINE TAB --- */}
        <TabsContent value="timeline" className="space-y-4">
          {caseData.timeline.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No Timeline Events"
              description="Actions on this case will appear here chronologically."
            />
          ) : (
            <div className="relative pl-6 space-y-4 border-l-2 border-border/50 ml-2 py-2">
              {caseData.timeline.map((event, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[31px] top-1 p-1 rounded-full bg-background border border-primary/50 text-primary">
                    <Clock className="h-2.5 w-2.5" />
                  </div>
                  <div className="bg-card/70 p-3 rounded-lg border border-border/50 text-xs space-y-1">
                    <p className="font-medium text-foreground">{event.summary}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(event.occurred_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Attach Scan Dialog */}
      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Attach Past Scan to Case</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select a scan from your account history to link to this investigation.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {loadingScans ? (
              <div className="py-8 flex justify-center text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading history...
              </div>
            ) : availableScans.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No scans available to attach. Run a new scan first.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {availableScans.map((s) => {
                  const isAttached = caseData.scans.some((attached) => attached.id === s.id)
                  const isBusy = attachingId === s.id

                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2.5 rounded-md border border-border/60 hover:bg-muted/40 transition-colors text-xs"
                    >
                      <div className="truncate mr-2 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-semibold text-foreground truncate">{s.title}</span>
                          <RiskBadge level={s.risk_level} size="sm" />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono truncate block">
                          {s.input_preview}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant={isAttached ? 'secondary' : 'default'}
                        disabled={isAttached || isBusy}
                        onClick={() => handleAttachScan(s.id)}
                        className="h-7 text-xs shrink-0"
                      >
                        {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : isAttached ? 'Attached' : 'Attach'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
