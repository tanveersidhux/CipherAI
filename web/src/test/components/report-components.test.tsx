import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { DisclaimerBanner } from '@/components/common/DisclaimerBanner'
import { DefangedUrl } from '@/components/common/DefangedUrl'
import { IndicatorItem } from '@/components/report/IndicatorItem'
import { AIExplanationPanel } from '@/components/report/AIExplanationPanel'
import { ScoreBreakdownTable } from '@/components/report/ScoreBreakdownTable'
import { EvidenceTimeline } from '@/components/report/EvidenceTimeline'
import { MANDATORY_DISCLAIMERS } from '@/lib/content/wording'
import {
  criticalReportFixture,
  fallbackAiReportFixture,
  ALL_MOCK_FIXTURES,
} from '@/lib/api/mocks/fixtures'

describe('Report Components', () => {
  describe('DisclaimerBanner', () => {
    it('shows the exact approved limitation sentence', () => {
      render(<DisclaimerBanner />)
      expect(
        screen.getByText(MANDATORY_DISCLAIMERS.lowRiskLimitation)
      ).toBeInTheDocument()
      expect(
        screen.getByRole('note', { name: 'Security evaluation disclaimer' })
      ).toBeInTheDocument()
    })
  })

  describe('DefangedUrl', () => {
    it('renders defanged representation and NEVER renders an anchor <a> element', () => {
      const raw = 'http://192.0.2.14:8080/secure/login'
      const { container } = render(<DefangedUrl url={raw} />)
      expect(screen.getByText('hxxp://192[.]0[.]2[.]14:8080/secure/login')).toBeInTheDocument()
      // Critical Security Check: Must not be a link
      const anchor = container.querySelector('a')
      expect(anchor).toBeNull()
    })

    it('has a copy button that copies the defanged value', async () => {
      const user = userEvent.setup()
      const writeTextMock = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: writeTextMock,
        },
        writable: true,
        configurable: true,
      })

      render(<DefangedUrl url="https://example.com" />)
      const copyBtn = screen.getByRole('button', { name: /Copy defanged address/i })
      await user.click(copyBtn)
      expect(writeTextMock).toHaveBeenCalledWith('hxxps://example[.]com')
    })
  })

  describe('IndicatorItem', () => {
    const indicator = criticalReportFixture.indicators[0]

    it('expands and collapses via keyboard or click', async () => {
      const user = userEvent.setup()
      render(<IndicatorItem indicator={indicator} />)

      const trigger = screen.getByRole('button', { expanded: false })
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveTextContent(indicator.indicator_id)

      // Click to open
      await user.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByText(indicator.description)).toBeInTheDocument()
      expect(screen.getByText(indicator.observed_value!)).toBeInTheDocument()

      // Click to close
      await user.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('AIExplanationPanel', () => {
    it('shows the AI-Generated label for llm output', () => {
      render(<AIExplanationPanel explanation={criticalReportFixture.ai_explanation} />)
      expect(screen.getByText('AI-Generated')).toBeInTheDocument()
      expect(screen.getByText(/AI Threat Summary/i)).toBeInTheDocument()
    })

    it('shows the Deterministic Summary label for fallback output', () => {
      render(<AIExplanationPanel explanation={fallbackAiReportFixture.ai_explanation} />)
      expect(screen.getByText('Deterministic Summary')).toBeInTheDocument()
      expect(screen.getByText(/Deterministic Threat Summary/i)).toBeInTheDocument()
    })

    it('focuses and highlights the cited indicator when an indicator chip is clicked', async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()

      // Create a mock element in document.body to test scroll and focus
      const targetElement = document.createElement('div')
      targetElement.id = 'indicator-URL_IP_HOST'
      const innerButton = document.createElement('button')
      targetElement.appendChild(innerButton)
      document.body.appendChild(targetElement)

      render(
        <AIExplanationPanel
          explanation={criticalReportFixture.ai_explanation}
          onSelectIndicator={onSelect}
        />
      )

      const chip = screen.getByRole('button', { name: /Jump to cited indicator URL_IP_HOST/i })
      await user.click(chip)

      expect(onSelect).toHaveBeenCalledWith('URL_IP_HOST')
      expect(document.activeElement).toBe(innerButton)

      document.body.removeChild(targetElement)
    })
  })

  describe('ScoreBreakdownTable', () => {
    it('total equals the sum of points clamped to 0 to 100 for every fixture', () => {
      for (const fixture of ALL_MOCK_FIXTURES) {
        const { unmount } = render(
          <ScoreBreakdownTable
            scoreContributions={fixture.score_breakdown}
            finalRiskScore={fixture.assessment.risk_score}
          />
        )

        const rawSum = fixture.score_breakdown.reduce(
          (sum, sc) => sum + sc.points,
          0
        )
        const clamped = Math.min(100, Math.max(0, rawSum))
        expect(
          screen.getByText(`${fixture.assessment.risk_score} / 100`)
        ).toBeInTheDocument()
        expect(fixture.assessment.risk_score).toBe(clamped)
        unmount()
      }
    })
  })

  describe('EvidenceTimeline', () => {
    it('shows "Not available in this version" state when empty', () => {
      render(<EvidenceTimeline externalEvidence={[]} />)
      expect(
        screen.getByText('External Evidence Not Available')
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Third-party reputation feeds and live blocklist queries are not enabled/i)
      ).toBeInTheDocument()
    })
  })
})
