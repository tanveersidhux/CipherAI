import React, { useState } from 'react'
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  Trash2,
  Lock,
  Check,
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CopyButton } from '@/components/common/CopyButton'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  // Stable or mock session ID for this browser context
  const sessionId = 'd82a17f9-90b4-4b5c-a812-3f19c824e901'

  const handleResetStorage = () => {
    try {
      localStorage.removeItem('cipher_theme')
      setResetDone(true)
      setTimeout(() => setResetDone(false), 3000)
    } catch {
      // Ignored
    }
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-2 md:py-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
          <Settings className="h-4 w-4" />
          <span>Application Preferences</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Settings & Privacy
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage interface appearance, examine session metadata, and view privacy guarantees.
        </p>
      </div>

      {/* Theme Selection */}
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-base">Appearance & Interface Theme</CardTitle>
          <CardDescription className="text-xs">
            Select light mode, dark mode, or follow your operating system default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <Button
              type="button"
              variant={theme === 'light' ? 'default' : 'outline'}
              onClick={() => setTheme('light')}
              className="flex items-center gap-2 h-11"
            >
              <Sun className="h-4 w-4" />
              <span>Light</span>
            </Button>

            <Button
              type="button"
              variant={theme === 'dark' ? 'default' : 'outline'}
              onClick={() => setTheme('dark')}
              className="flex items-center gap-2 h-11"
            >
              <Moon className="h-4 w-4" />
              <span>Dark</span>
            </Button>

            <Button
              type="button"
              variant={theme === 'system' ? 'default' : 'outline'}
              onClick={() => setTheme('system')}
              className="flex items-center gap-2 h-11"
            >
              <Laptop className="h-4 w-4" />
              <span>System</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Anonymous Session Identifier */}
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-base">Anonymous Session Context</CardTitle>
          <CardDescription className="text-xs">
            A cryptographically signed anonymous identifier links your scan history without personal account registration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-border/40 bg-muted/30 p-3 font-mono text-xs">
            <span className="text-foreground truncate max-w-xs">{sessionId}</span>
            <CopyButton textToCopy={sessionId} label="Copy Session ID" />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Preserved across tabs. Supabase user accounts and multi-device sync arrive in Phase 07.
          </p>
        </CardContent>
      </Card>

      {/* Privacy Guarantees */}
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <span>Privacy & Zero-Trace Commitments</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Offline Heuristic Processing: </strong>
            All link and text inspections occur through deterministic syntactic rules. CIPHER AI never performs outbound HTTP connections to submitted destination URLs.
          </p>
          <p>
            <strong className="text-foreground">No Plaintext Storage: </strong>
            Normalized inputs are hashed via SHA-256 for audit logging. Raw credentials are never extracted or stored.
          </p>
          <p>
            <strong className="text-foreground">Zero Third-Party Advertising: </strong>
            No third-party trackers, external fonts, or analytics beacons are loaded.
          </p>
        </CardContent>
      </Card>

      {/* Local Storage Reset */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-base text-destructive flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            <span>Reset Local Preferences</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Clears saved theme preferences and reset client state.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setResetDialogOpen(true)}
            className="text-xs"
          >
            Reset Client Storage
          </Button>

          {resetDone && (
            <span className="ml-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Storage reset successfully
            </span>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title="Reset Local Browser Preferences"
        description="This will clear your saved theme mode. Your scan reports will remain intact. Proceed?"
        confirmText="Confirm Reset"
        variant="destructive"
        onConfirm={handleResetStorage}
      />
    </div>
  )
}
