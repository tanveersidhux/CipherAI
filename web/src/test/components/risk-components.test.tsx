import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { RiskBadge } from '@/components/report/RiskBadge'
import { RiskGauge } from '@/components/report/RiskGauge'
import { ConfidenceMeter } from '@/components/report/ConfidenceMeter'
import { SeverityBadge } from '@/components/report/SeverityBadge'
import type { RiskLevel, SeverityLevel } from '@/types/threat-report'
import { RISK_LEVEL_LABELS } from '@/lib/content/wording'

describe('Risk and Presentation Components', () => {
  describe('RiskBadge', () => {
    const levels: RiskLevel[] = [
      'low',
      'medium',
      'high',
      'critical',
      'inconclusive',
    ]

    it.each(levels)('renders text label and icon for risk level: %s', (level) => {
      render(<RiskBadge level={level} />)
      const expectedText = RISK_LEVEL_LABELS[level]
      const badge = screen.getByRole('status', {
        name: `Risk Level: ${expectedText}`,
      })
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent(expectedText)
    })
  })

  describe('RiskGauge', () => {
    it('exposes role meter, aria-valuenow, min, max, and text label in words', () => {
      render(<RiskGauge score={85} level="critical" />)
      const meter = screen.getByRole('meter')
      expect(meter).toBeInTheDocument()
      expect(meter).toHaveAttribute('aria-valuenow', '85')
      expect(meter).toHaveAttribute('aria-valuemin', '0')
      expect(meter).toHaveAttribute('aria-valuemax', '100')
      expect(meter.getAttribute('aria-label')).toContain('85 out of 100')
      expect(meter.getAttribute('aria-label')).toContain(RISK_LEVEL_LABELS.critical)
      expect(screen.getByText('85')).toBeInTheDocument()
    })

    it('renders N/A for inconclusive without aria-valuenow', () => {
      render(<RiskGauge score={0} level="inconclusive" />)
      const meter = screen.getByRole('meter')
      expect(meter).toBeInTheDocument()
      expect(meter).not.toHaveAttribute('aria-valuenow')
      expect(screen.getByText('N/A')).toBeInTheDocument()
      expect(meter.getAttribute('aria-label')).toContain('Inconclusive')
    })
  })

  describe('ConfidenceMeter', () => {
    it('renders independent confidence level', () => {
      render(<ConfidenceMeter confidence="high" />)
      expect(
        screen.getByRole('group', { name: 'Evaluation Confidence: high' })
      ).toBeInTheDocument()
      expect(screen.getByText(/HIGH/i)).toBeInTheDocument()
    })
  })

  describe('SeverityBadge', () => {
    const severities: SeverityLevel[] = ['info', 'low', 'medium', 'high', 'critical']
    it.each(severities)('renders severity %s', (sev) => {
      render(<SeverityBadge severity={sev} />)
      expect(screen.getByText(sev.toUpperCase())).toBeInTheDocument()
    })
  })
})
