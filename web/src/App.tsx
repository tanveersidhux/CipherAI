import React, { Component, type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { CipherApiProvider } from '@/lib/api/client'
import { AppRoutes } from '@/routes'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class AppErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(_error: Error, errorInfo: React.ErrorInfo) {
    // Untrusted content or sensitive errors are sanitized and not logged with full user input
    console.error('CIPHER AI Application Error:', errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <ErrorState
            error={this.state.error}
            onRetry={this.handleReset}
          />
          <div className="mt-4">
            <Button variant="outline" onClick={this.handleReset}>
              Reload Application
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <CipherApiProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </CipherApiProvider>
    </AppErrorBoundary>
  )
}
