import React, { useState } from 'react'
import { Link2, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { validateUrlInput } from '@/lib/validation/scan-validation'
import { cn } from '@/lib/utils'

export interface UrlScanFormProps {
  onSubmit: (url: string, options: { use_ai: boolean; persist: boolean }) => Promise<void>
  isSubmitting?: boolean
  className?: string
  autoFocus?: boolean
}

export function UrlScanForm({
  onSubmit,
  isSubmitting = false,
  className,
  autoFocus = false,
}: UrlScanFormProps) {
  const [url, setUrl] = useState('')
  const [touched, setTouched] = useState(false)
  const [useAi, setUseAi] = useState(true)

  const validation = validateUrlInput(url)
  const hasError = touched && !validation.isValid && url.length > 0
  const canSubmit = !isSubmitting && url.trim().length > 0 && validation.isValid

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!validation.isValid) return
    await onSubmit(url.trim(), { use_ai: useAi, persist: true })
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
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
          <input
            type="checkbox"
            checked={useAi}
            onChange={(e) => setUseAi(e.target.checked)}
            disabled={isSubmitting}
            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
          />
          <span className="inline-flex items-center gap-1 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Enable AI Explanation
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
