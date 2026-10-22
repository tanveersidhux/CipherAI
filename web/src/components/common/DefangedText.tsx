/**
 * Accessible defanged text renderer.
 * Protects users by displaying URLs in defanged form (hxxps://...[.]com)
 * without clickable hyperlinks, providing a safe copy-to-clipboard button.
 */

import React, { useState } from 'react'
import { Copy, Check, ShieldAlert } from 'lucide-react'
import { defangUrl } from '@/lib/defang'
import { Button } from '@/components/ui/button'

interface DefangedTextProps {
  url: string
  className?: string
  showWarning?: boolean
}

export function DefangedText({ url, className = '', showWarning = false }: DefangedTextProps) {
  const [copied, setCopied] = useState(false)
  const defanged = defangUrl(url)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore clipboard write failure
    }
  }

  return (
    <div className={`inline-flex items-center gap-2 font-mono text-xs break-all ${className}`}>
      {showWarning && (
        <ShieldAlert className="h-3.5 w-3.5 text-warning shrink-0" aria-label="Untrusted target" />
      )}
      <span className="select-all text-foreground/90 bg-muted/40 px-1.5 py-0.5 rounded border border-border/40">
        {defanged}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
        title="Copy original URL"
        aria-label="Copy original URL"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}
