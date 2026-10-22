import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConnectionStatus } from './ConnectionStatus'
import * as HealthModule from '@/lib/api/health'
import { CONNECTION_STATUS_LABELS } from '@/lib/content/wording'

describe('ConnectionStatus Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders checking state initially when initialCheck is true', () => {
    vi.spyOn(HealthModule, 'getHealth').mockImplementation(
      () => new Promise(() => {}) // pending promise
    )

    render(<ConnectionStatus initialCheck={true} />)

    expect(screen.getByText(CONNECTION_STATUS_LABELS.checking)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: CONNECTION_STATUS_LABELS.retry })).toBeDisabled()
  })

  it('renders reachable state and dependency labels when getHealth returns ok', async () => {
    vi.spyOn(HealthModule, 'getHealth').mockResolvedValueOnce({
      ok: true,
      data: {
        status: 'ok',
        app_version: '1.0.0',
        environment: 'development',
        timestamp: '2026-10-22T12:00:00Z',
        dependencies: {
          database: 'ok',
          llm: 'disabled',
        },
      },
    })

    render(<ConnectionStatus initialCheck={true} />)

    await waitFor(() => {
      expect(screen.getByText(CONNECTION_STATUS_LABELS.backendReachable)).toBeInTheDocument()
    })

    expect(screen.getByText(CONNECTION_STATUS_LABELS.dbOk)).toBeInTheDocument()
    expect(screen.getByText(CONNECTION_STATUS_LABELS.llmDisabled)).toBeInTheDocument()
  })

  it('renders unreachable state when backend cannot be contacted', async () => {
    vi.spyOn(HealthModule, 'getHealth').mockResolvedValueOnce({
      ok: false,
      reason: 'network',
    })

    render(<ConnectionStatus initialCheck={true} />)

    await waitFor(() => {
      expect(screen.getByText(CONNECTION_STATUS_LABELS.backendUnreachable)).toBeInTheDocument()
    })

    expect(
      screen.getByText(/operating in offline demonstration mode/i)
    ).toBeInTheDocument()
  })

  it('allows manual retry by clicking the retry button', async () => {
    const user = userEvent.setup()
    const getHealthSpy = vi
      .spyOn(HealthModule, 'getHealth')
      .mockResolvedValueOnce({
        ok: false,
        reason: 'network',
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          status: 'ok',
          app_version: '1.0.0',
          environment: 'development',
          timestamp: '2026-10-22T12:00:00Z',
          dependencies: {
            database: 'not_configured',
            llm: 'not_configured',
          },
        },
      })

    render(<ConnectionStatus initialCheck={true} />)

    await waitFor(() => {
      expect(screen.getByText(CONNECTION_STATUS_LABELS.backendUnreachable)).toBeInTheDocument()
    })

    const retryButton = screen.getByRole('button', { name: CONNECTION_STATUS_LABELS.retry })
    expect(retryButton).toBeEnabled()

    await user.click(retryButton)

    await waitFor(() => {
      expect(screen.getByText(CONNECTION_STATUS_LABELS.backendReachable)).toBeInTheDocument()
    })

    expect(getHealthSpy).toHaveBeenCalledTimes(2)
  })
})
