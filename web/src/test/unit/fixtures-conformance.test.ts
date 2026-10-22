import { describe, it, expect } from 'vitest'
import { isThreatReport, type ThreatReport } from '@/types/threat-report'
import { ALL_MOCK_FIXTURES } from '@/lib/api/mocks/fixtures'
import { MANDATORY_DISCLAIMERS } from '@/lib/content/wording'

describe('Mock Fixtures Conformance to Phase 01 ThreatReport Schema', () => {
  it('contains at least 7 comprehensive fixtures matching required test cases', () => {
    expect(ALL_MOCK_FIXTURES.length).toBeGreaterThanOrEqual(7)
  })

  it('validates that every fixture strictly passes the ThreatReport runtime type guard', () => {
    for (const fixture of ALL_MOCK_FIXTURES) {
      expect(isThreatReport(fixture)).toBe(true)
    }
  })

  it('verifies that numeric risk scores strictly match Phase 01 risk tier thresholds', () => {
    for (const fixture of ALL_MOCK_FIXTURES) {
      const { risk_score, risk_level } = fixture.assessment

      if (risk_level === 'inconclusive') {
        expect(risk_score).toBe(0)
        expect(fixture.assessment.limitations).toContain(
          MANDATORY_DISCLAIMERS.inconclusiveNotice
        )
      } else if (risk_level === 'low') {
        expect(risk_score).toBeGreaterThanOrEqual(0)
        expect(risk_score).toBeLessThanOrEqual(24)
        expect(fixture.assessment.limitations).toContain(
          MANDATORY_DISCLAIMERS.lowRiskLimitation
        )
      } else if (risk_level === 'medium') {
        expect(risk_score).toBeGreaterThanOrEqual(25)
        expect(risk_score).toBeLessThanOrEqual(49)
      } else if (risk_level === 'high') {
        expect(risk_score).toBeGreaterThanOrEqual(50)
        expect(risk_score).toBeLessThanOrEqual(74)
      } else if (risk_level === 'critical') {
        expect(risk_score).toBeGreaterThanOrEqual(75)
        expect(risk_score).toBeLessThanOrEqual(100)
      } else {
        throw new Error(`Unknown risk level encountered: ${risk_level}`)
      }
    }
  })

  it('verifies that score breakdown points sum equals or bounds the risk score', () => {
    for (const fixture of ALL_MOCK_FIXTURES) {
      if (fixture.assessment.risk_level === 'inconclusive') continue

      const rawSum = fixture.score_breakdown.reduce(
        (acc, item) => acc + item.points,
        0
      )
      const clamped = Math.min(100, Math.max(0, rawSum))
      // In deterministic scoring, risk score equals the clamped sum of contributions
      expect(fixture.assessment.risk_score).toBe(clamped)
    }
  })

  it('verifies cited indicator IDs in AI explanations strictly exist in the indicators array', () => {
    for (const fixture of ALL_MOCK_FIXTURES) {
      const validIndicatorIds = new Set(
        fixture.indicators.map((i) => i.indicator_id)
      )

      for (const finding of fixture.ai_explanation.key_findings) {
        for (const citedId of finding.indicator_ids) {
          expect(validIndicatorIds.has(citedId)).toBe(true)
        }
      }
    }
  })

  it('verifies the fallback AI case is properly labeled as deterministic_fallback', () => {
    const fallbackCase = ALL_MOCK_FIXTURES.find(
      (f) => f.processing.ai_status === 'fallback_used'
    )
    expect(fallbackCase).toBeDefined()
    expect(fallbackCase?.ai_explanation.generated_by).toBe('deterministic_fallback')
    expect(fallbackCase?.ai_explanation.model).toBeNull()
  })

  it('verifies the adversarial stress case exists with homoglyph indicators', () => {
    const advCase = ALL_MOCK_FIXTURES.find((f) =>
      f.indicators.some((i) => i.indicator_id === 'URL_HOMOGLYPH_CYRILLIC')
    )
    expect(advCase).toBeDefined()
    expect(advCase?.input.input_length).toBeGreaterThan(250)
  })
})
