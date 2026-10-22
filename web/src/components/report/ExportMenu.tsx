import React, { useState, useRef, useEffect } from 'react'
import { Download, FileJson, FileSpreadsheet, Printer, ChevronDown } from 'lucide-react'

interface ExportMenuProps {
  scanId?: string | null
  caseId?: string | null
  targetName?: string
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ scanId, caseId, targetName = 'assessment' }) => {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleDownload = (format: 'json' | 'csv') => {
    setOpen(false)
    const baseUrl = scanId
      ? `/api/v1/scans/${scanId}/export?format=${format}`
      : `/api/v1/cases/${caseId}/export?format=${format}`

    const link = document.createElement('a')
    link.href = baseUrl
    link.setAttribute('download', `${targetName}-export.${format}`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const handlePrint = () => {
    setOpen(false)
    if (typeof window !== 'undefined') {
      if (scanId) {
        window.open(`/reports/${scanId}/print`, '_blank')
      } else {
        window.print()
      }
    }
  }

  if (!scanId && !caseId) {
    return null
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary/80 hover:bg-secondary text-foreground border border-border/50 shadow-sm transition-all"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Download className="w-3.5 h-3.5 text-primary" />
        Export
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border/60 bg-popover/95 backdrop-blur-md p-1 shadow-xl z-50 animate-in fade-in-50 zoom-in-95">
          <button
            onClick={() => handleDownload('json')}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-accent/60 transition-colors"
          >
            <FileJson className="w-4 h-4 text-emerald-400" />
            Download JSON
          </button>
          <button
            onClick={() => handleDownload('csv')}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-accent/60 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-sky-400" />
            Download CSV
          </button>
          <div className="h-px bg-border/40 my-1" />
          <button
            onClick={handlePrint}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-accent/60 transition-colors"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            Print / PDF Report
          </button>
        </div>
      )}
    </div>
  )
}
