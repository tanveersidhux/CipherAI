import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExplanationPanel } from '../report/ExplanationPanel'
import {
  mockAIExplanationResponse,
  mockFallbackExplanationResponse,
  mockHostileExplanationResponse,
  mockHighRiskReport,
} from '@/test/fixtures/reports'
import { ApiError } from '@/lib/api/errors'

describe('ExplanationPanel Component', () => {
  it('renders accessible loading skeleton when status is loading', () => {
    render(
      <ExplanationPanel
        status="loading"
        data={null}
        error={null}
      />
    )

    const statusEl = screen.getByRole('status')
    expect(statusEl).toBeInTheDocument()
    expect(statusEl).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText(/Generating Threat Explanation/i)).toBeInTheDocument()
  })

  it('renders friendly error message and retry button on failure', () => {
    const onRetry = vi.fn()
    const error = new ApiError('DEPENDENCY_UNAVAILABLE', 'AI gateway timed out.', [], 'req_err_trace', 504)

    render(
      <ExplanationPanel
        status="error"
        data={null}
        error={error}
        onRetry={onRetry}
      />
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Explanation Currently Unavailable/i)).toBeInTheDocument()
    expect(screen.getByText(/AI gateway timed out/i)).toBeInTheDocument()

    const retryBtn = screen.getByRole('button', { name: /Retry/i })
    fireEvent.click(retryBtn)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders AI provenance badge when explanation_source is ai', () => {
    render(
      <ExplanationPanel
        status="success"
        data={mockAIExplanationResponse}
        error={null}
        knownIndicators={mockHighRiskReport.indicators}
      />
    )

    expect(screen.getByText('AI-generated explanation')).toBeInTheDocument()
    expect(screen.getByText(/AI Threat Intelligence Analysis/i)).toBeInTheDocument()
    expect(screen.getByText(mockAIExplanationResponse.explanation.summary)).toBeInTheDocument()
  })

  it('renders neutral standard badge when explanation_source is deterministic_fallback', () => {
    render(
      <ExplanationPanel
        status="success"
        data={mockFallbackExplanationResponse}
        error={null}
        knownIndicators={mockHighRiskReport.indicators}
      />
    )

    expect(screen.getByText('Standard explanation (AI unavailable)')).toBeInTheDocument()
    expect(screen.getByText(/Standard Security Explanation/i)).toBeInTheDocument()
  })

  it('renders limitations and disclaimer visibly without being hidden in toggles', () => {
    render(
      <ExplanationPanel
        status="success"
        data={mockAIExplanationResponse}
        error={null}
        knownIndicators={mockHighRiskReport.indicators}
      />
    )

    expect(screen.getByText(/Analysis Limitations & Uncertainty/i)).toBeInTheDocument()
    expect(screen.getByText(mockAIExplanationResponse.explanation.limitations[0])).toBeInTheDocument()
    expect(screen.getByText(/CIPHER AI evaluations are advisory only/i)).toBeInTheDocument()
  })

  it('renders hostile script tags and markdown as inert plain escaped text', () => {
    const { container } = render(
      <ExplanationPanel
        status="success"
        data={mockHostileExplanationResponse}
        error={null}
        knownIndicators={mockHighRiskReport.indicators}
      />
    )

    // Ensure NO script tag or HTML anchor tag was parsed into DOM
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('a[href="http://evil.com"]')).toBeNull()

    // Plain text is rendered inertly
    expect(
      screen.getByText(/Exploit attempt: <script>alert\("pwnd"\)<\/script>/i)
    ).toBeInTheDocument()
  })

  it('links known indicator citations to DOM targets and ignores unknown IDs defensively', () => {
    const onSelect = vi.fn()
    const dataWithForeignId = {
      ...mockAIExplanationResponse,
      explanation: {
        ...mockAIExplanationResponse.explanation,
        key_findings: [
          {
            title: 'Mixed Findings',
            detail: 'Finding details',
            evidence_ids: ['URL_CREDENTIAL_PATH_KEYWORD', 'FOREIGN_NONEXISTENT_ID'],
          },
        ],
      },
    }

    render(
      <ExplanationPanel
        status="success"
        data={dataWithForeignId}
        error={null}
        onSelectIndicator={onSelect}
        knownIndicators={mockHighRiskReport.indicators}
      />
    )

    // Known indicator rendered as clickable button
    const validChip = screen.getByRole('button', { name: /Jump to cited evidence URL_CREDENTIAL_PATH_KEYWORD/i })
    expect(validChip).toBeInTheDocument()
    fireEvent.click(validChip)
    expect(onSelect).toHaveBeenCalledWith('URL_CREDENTIAL_PATH_KEYWORD')

    // Foreign nonexistent indicator is rendered as plain text span, NOT a clickable button
    expect(screen.getByText('#FOREIGN_NONEXISTENT_ID')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Jump to cited evidence FOREIGN_NONEXISTENT_ID/i })).toBeNull()
  })
})
