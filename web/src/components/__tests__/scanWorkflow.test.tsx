import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ScanUrlPage from '@/pages/ScanUrlPage'
import ScanMessagePage from '@/pages/ScanMessagePage'
import { ScanSessionProvider } from '@/context/ScanSessionProvider'
import {
  mockHighRiskReport,
  mockInconclusiveReport,
  mockHostileTextReport,
  mockAIExplanationResponse,
} from '@/test/fixtures/reports'
import * as scanApi from '@/lib/api/scan'
import * as explanationApi from '@/lib/api/explanations'
import { ApiError } from '@/lib/api/errors'

import { CipherApiProvider } from '@/lib/api/client'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <CipherApiProvider>
      <ScanSessionProvider>
        {ui}
      </ScanSessionProvider>
    </CipherApiProvider>
  )
}

describe('End-to-End Scan Workflows', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(explanationApi, 'requestExplanation').mockResolvedValue(mockAIExplanationResponse)
  })

  it('URL scan happy path: submits valid URL and displays ThreatReportView with async explanation', async () => {
    vi.spyOn(scanApi, 'scanUrl').mockResolvedValueOnce(mockHighRiskReport)

    renderWithProviders(<ScanUrlPage />)

    const input = screen.getByLabelText(/Target URL to Inspect/i)
    fireEvent.change(input, { target: { value: 'https://secure-login.example.test/verify' } })

    const submitBtn = screen.getByRole('button', { name: /Analyze URL/i })
    expect(submitBtn).toBeEnabled()
    fireEvent.click(submitBtn)

    // Verify report header rendered inline below form
    await waitFor(() => {
      expect(screen.getByText('Threat Evaluation Report')).toBeInTheDocument()
    })

    // Verify defanged URL displayed
    expect(screen.getByText(/hxxps:\/\/secure-login\[\.\]example\[\.\]test\/verify/i)).toBeInTheDocument()

    // Verify risk badge
    expect(screen.getByText(/High Risk Detected/i)).toBeInTheDocument()

    // Verify asynchronous explanation badge rendered
    await waitFor(() => {
      expect(screen.getByText('AI-generated explanation')).toBeInTheDocument()
    })
  })

  it('Message scan happy path: submits message text and displays ThreatReportView', async () => {
    const messageReport = {
      ...mockHighRiskReport,
      scan_type: 'message' as const,
      input: {
        ...mockHighRiskReport.input,
        display_value: 'URGENT: Your account was suspended.',
      },
    }
    vi.spyOn(scanApi, 'scanMessage').mockResolvedValueOnce(messageReport)

    renderWithProviders(<ScanMessagePage />)

    const textarea = screen.getByLabelText(/Suspicious Message Text/i)
    fireEvent.change(textarea, {
      target: { value: 'URGENT: Your account was suspended. Click here now.' },
    })

    const submitBtn = screen.getByRole('button', { name: /Analyze Message/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Threat Evaluation Report')).toBeInTheDocument()
      expect(screen.getByText(/URGENT: Your account was suspended/i)).toBeInTheDocument()
    })
  })

  it('renders cautionary inconclusive notice and never claims safe for inconclusive reports', async () => {
    vi.spyOn(scanApi, 'scanUrl').mockResolvedValueOnce(mockInconclusiveReport)

    renderWithProviders(<ScanUrlPage />)

    const input = screen.getByLabelText(/Target URL to Inspect/i)
    fireEvent.change(input, { target: { value: 'https://example.com/unclear' } })
    fireEvent.click(screen.getByRole('button', { name: /Analyze URL/i }))

    await waitFor(() => {
      expect(screen.getByText(/Cautionary Note: Inconclusive Assessment/i)).toBeInTheDocument()
    })

    // Absolute invariant check: never claim safe
    expect(screen.queryByText(/^Safe$/i)).toBeNull()
    expect(screen.queryByText(/Completely Safe/i)).toBeNull()
  })

  it('safely renders hostile text reports without anchor tags or script execution', async () => {
    vi.spyOn(scanApi, 'scanUrl').mockResolvedValueOnce(mockHostileTextReport)

    const { container } = renderWithProviders(<ScanUrlPage />)

    const input = screen.getByLabelText(/Target URL to Inspect/i)
    fireEvent.change(input, { target: { value: 'https://test.com/<script>alert(1)</script>' } })
    fireEvent.click(screen.getByRole('button', { name: /Analyze URL/i }))

    await waitFor(() => {
      expect(screen.getByText('Threat Evaluation Report')).toBeInTheDocument()
    })

    // Ensure URL is NEVER rendered as clickable link
    expect(container.querySelector('a[href*="test.com"]')).toBeNull()
    expect(container.querySelector('script')).toBeNull()
  })

  it('displays friendly ErrorAlert on 429 rate limit failure', async () => {
    vi.spyOn(scanApi, 'scanUrl').mockRejectedValueOnce(
      new ApiError('RATE_LIMITED', 'Rate limit exceeded. Please wait 10s.', [], 'req_rate_01', 429, 10)
    )

    renderWithProviders(<ScanUrlPage />)

    const input = screen.getByLabelText(/Target URL to Inspect/i)
    fireEvent.change(input, { target: { value: 'https://example.com/test' } })
    fireEvent.click(screen.getByRole('button', { name: /Analyze URL/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/RATE LIMITED/i)).toBeInTheDocument()
      expect(screen.getByText(/Please wait 10s before retrying/i)).toBeInTheDocument()
    })
  })
})
