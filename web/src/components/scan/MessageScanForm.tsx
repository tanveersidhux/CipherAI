import React, { useState, useEffect } from 'react'
import { MessageSquareWarning, ArrowRight, Loader2, Sparkles, HelpCircle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { validateMessageInput, MESSAGE_MAX_LENGTH } from '@/lib/validation'
import { cn } from '@/lib/utils'

export type MessageChannel = 'sms' | 'email_body' | 'chat' | 'social' | 'unknown'

export interface MessageScanFormProps {
  onSubmit: (
    message: string,
    channel: MessageChannel,
    options: { use_ai: boolean; persist: boolean }
  ) => Promise<void>
  isSubmitting?: boolean
  className?: string
  initialValue?: string
}

const SAMPLE_MESSAGES = [
  {
    label: 'Urgent Account Freeze',
    channel: 'sms' as MessageChannel,
    text: 'URGENT: Your account has been suspended due to unauthorized access. Click here immediately to verify your identity: http://secure-verify.example.test',
  },
  {
    label: 'Package Delivery Scam',
    channel: 'sms' as MessageChannel,
    text: 'USPS: Your package could not be delivered due to an incorrect address. A $1.50 redelivery fee is required. Update details: http://parcel-redelivery.example.test',
  },
  {
    label: 'Gift Card / Lottery',
    channel: 'chat' as MessageChannel,
    text: 'Congratulations! You have been selected to receive a $1,000 Amazon gift card. Claim your voucher right now: http://claim-rewards.example.test',
  },
]

export function MessageScanForm({
  onSubmit,
  isSubmitting = false,
  className,
  initialValue = '',
}: MessageScanFormProps) {
  const [message, setMessage] = useState(initialValue)
  const [channel, setChannel] = useState<MessageChannel>('sms')
  const [touched, setTouched] = useState(false)
  const [useAi, setUseAi] = useState(true)
  const [elapsedSlow, setElapsedSlow] = useState(false)

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

  const validation = validateMessageInput(message)
  const isOverLimit = message.length > MESSAGE_MAX_LENGTH
  const hasError = (touched && !validation.isValid && message.length > 0) || isOverLimit
  const canSubmit =
    !isSubmitting && message.trim().length > 0 && validation.isValid && !isOverLimit

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!validation.isValid || isOverLimit) {
      const textarea = document.getElementById('message-scan-input')
      if (textarea) textarea.focus()
      return
    }
    await onSubmit(message.trim(), channel, { use_ai: useAi, persist: true })
  }

  const handleSelectSample = (sampleText: string, sampleChannel: MessageChannel) => {
    setMessage(sampleText)
    setChannel(sampleChannel)
    setTouched(true)
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)} noValidate>
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label
            htmlFor="message-scan-input"
            className="block text-sm font-semibold text-foreground"
          >
            Suspicious Message Text
          </label>
          <div className="flex items-center gap-2">
            <label
              htmlFor="message-channel-select"
              className="text-xs text-muted-foreground font-medium"
            >
              Channel:
            </label>
            <select
              id="message-channel-select"
              value={channel}
              onChange={(e) => setChannel(e.target.value as MessageChannel)}
              disabled={isSubmitting}
              className="rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="sms">SMS / Text Message</option>
              <option value="email_body">Email Body</option>
              <option value="chat">Chat (WhatsApp, Telegram)</option>
              <option value="social">Social Media DM</option>
              <option value="unknown">Other / Unknown</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <Textarea
            id="message-scan-input"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              if (!touched) setTouched(true)
            }}
            onBlur={() => setTouched(true)}
            placeholder="Paste suspicious text here (e.g. 'URGENT: Your account has been suspended. Click here to verify...')"
            disabled={isSubmitting}
            rows={5}
            aria-describedby={hasError ? 'message-error-msg' : 'message-counter-msg'}
            aria-invalid={hasError}
            className={cn(
              'font-sans text-xs sm:text-sm resize-y min-h-[120px]',
              hasError && 'border-destructive focus-visible:ring-destructive'
            )}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          {hasError ? (
            <p id="message-error-msg" role="alert" className="text-destructive font-medium">
              {validation.error}
            </p>
          ) : (
            <p className="text-muted-foreground">
              Analyzes social engineering, urgency tactics, and fraudulent lures.
            </p>
          )}

          <span
            id="message-counter-msg"
            className={cn(
              'font-mono text-[11px] shrink-0 ml-2',
              isOverLimit ? 'text-destructive font-bold' : 'text-muted-foreground'
            )}
          >
            {message.length} / {MESSAGE_MAX_LENGTH}
          </span>
        </div>

        {/* Demo Sample Input Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <HelpCircle className="h-3 w-3" /> Samples:
          </span>
          {SAMPLE_MESSAGES.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSample(sample.text, sample.channel)}
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
              <span>Analyzing Message...</span>
            </>
          ) : (
            <>
              <MessageSquareWarning className="h-4 w-4" />
              <span>Analyze Message</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
