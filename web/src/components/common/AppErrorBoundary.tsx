/**
 * Top-Level Application Error Boundary.
 * Catches unhandled rendering exceptions and displays a friendly recovery screen
 * without leaking raw errors or unescaped user payloads.
 */

import React, { Component, type ReactNode } from 'react'
import { AlertOctagon, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface AppErrorBoundaryProps {
  children: ReactNode
}

export interface AppErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log safely without sensitive or hostile data leakage
    console.error('CIPHER AI Application Error:', error.message, errorInfo.componentStack)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center"
        >
          <div className="max-w-md w-full rounded-xl border border-destructive/30 bg-card p-6 sm:p-8 space-y-4 shadow-lg">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertOctagon className="h-6 w-6" aria-hidden="true" />
            </div>

            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Something went wrong
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              An unexpected interface error occurred. Scanned data is safe and has not been compromised.
            </p>

            <div className="pt-2">
              <Button
                type="button"
                onClick={this.handleReload}
                className="gap-2 font-semibold"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reload Application</span>
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
