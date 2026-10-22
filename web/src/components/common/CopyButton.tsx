import React, { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface CopyButtonProps {
  textToCopy: string
  label?: string
  className?: string
}

export function CopyButton({
  textToCopy,
  label = 'Copy to clipboard',
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy)
      } else {
        // Fallback for environments where clipboard API is blocked
        const textArea = document.createElement('textarea')
        textArea.value = textToCopy
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Graceful fallback
    }
  }, [textToCopy])

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className={cn(
        'h-8 px-2 text-xs text-muted-foreground hover:text-foreground transition-all min-h-[36px]',
        className
      )}
      aria-label={copied ? 'Copied to clipboard' : label}
      title={copied ? 'Copied!' : label}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-500 mr-1 animate-in fade-in zoom-in" />
          <span className="text-emerald-500 font-medium">Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5 mr-1" />
          <span>Copy</span>
        </>
      )}
    </Button>
  )
}
