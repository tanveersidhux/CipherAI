import React, { useState, useEffect } from 'react'
import { Link2, ArrowRight, Loader2, Sparkles, HelpCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { validateUrlInput } from '@/lib/validation'
import { cn } from '@/lib/utils'

export interface UrlScanFormProps {
  onSubmit: (url: string, options: { use_ai: boolean; persist: boolean }) => Promise<void>
  isSubmitting?: boolean
  className?: string
  autoFocus?: boolean
  initialValue?: string
}

const SAMPLE_URLS = [
  {
    label: 'Suspicious Login Demo',
    url: 'https://secure-login.example.test/verify-account',
  },
  {
    label: 'IP Host Mask Demo',
    url: 'https://192.0.2.1/update-account',
  },
  {
    label: 'Subdomain Phish Demo',
    url: 'https://account.paypal.com.notice-alert.example.test/auth',
  },
]

export function UrlScanForm({
  onSubmit,
  isSubmitting = false,
  className,
  autoFocus = false,
  initialValue = '',
}: UrlScanFormProps) {
  const [url, setUrl] = useState(initialValue)
  const [touched, setTouched] = useState(false)
  const [useAi, setUseAi] = useState(true)
  const [elapsedSlow, setElapsedSlow] = useState(false)

  // Track slow requests > 8s
  useEffect(() => {
    if (!isSubmitting) return
    const timer = setTimeout(() => {
      setElapsedSlow(true)
    }, 8000)
    return () => {
      clearTimeout(timer)
      setElapsedSlow(false)
    }
  }, [isSubmitting])

  const validation = validateUrlInput(url)
  const hasError = touched && !validation.isValid && url.length > 0
  const canSubmit = !isSubmitting && url.trim().length > 0 && validation.isValid

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!validation.isValid) {
      const inputEl = document.getElementById('url-scan-input')
      if (inputEl) inputEl.focus()
      return
    }
    await onSubmit(url.trim(), { use_ai: useAi, persist: true })
  }

  const handleSelectSample = (sampleUrl: string) => {
    setUrl(sampleUrl)
    setTouched(true)
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)} noValidate>
      <div className="space-y-2">
        <label
          htmlFor="url-scan-input"
          className="block text-sm font-semibold text-foreground"
        >
          Target URL to Inspect
        </label>
        <div className="relative flex items-center">
          <Link2
            className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            id="url-scan-input"
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              if (!touched) setTouched(true)
            }}
            onBlur={() => setTouched(true)}
            placeholder="https://secure-login.example.test/verify"
            autoFocus={autoFocus}
            disabled={isSubmitting}
            aria-describedby={hasError ? 'url-error-msg' : 'url-helper-text'}
            aria-invalid={hasError}
            className={cn(
              'pl-10 pr-4 font-mono text-xs sm:text-sm h-11',
              hasError && 'border-destructive focus-visible:ring-destructive'
            )}
          />
        </div>

        {hasError ? (
          <p id="url-error-msg" role="alert" className="text-xs text-destructive font-medium">
            {validation.error}
          </p>
        ) : (
          <p id="url-helper-text" className="text-xs text-muted-foreground">
            Enter a complete web address. Lexical analysis is offline and does not visit or execute the target.
          </p>
        )}

        {/* Demo Sample Input Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <HelpCircle className="h-3 w-3" /> Samples:
          </span>
          {SAMPLE_URLS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSample(sample.url)}
              disabled={isSubmitting}
              className="rounded-md border border-border/60 bg-muted/40 hover:bg-muted px-2 py-0.5 text-[11px] text-foreground transition-colors disabled:opacity-50"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* Elapsed time notice */}
      {elapsedSlow && isSubmitting && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-700 dark:text-amber-400"
        >
          This is taking longer than usual. Performing thorough threat engine inspection...
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
          <input
            type="checkbox"
            checked={useAi}
            onChange={(e) => setUseAi(e.target.checked)}
            disabled={isSubmitting}
            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
          />
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span>Gemini 3.5 Flash AI Intelligence</span>
            <span className="rounded-full bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[10px] text-primary font-semibold">
              Heavy AI
            </span>
          </span>
        </label>

        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full sm:w-auto font-semibold gap-2 min-h-[44px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing Threat...</span>
            </>
          ) : (
            <>
              <span>Analyze URL</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
