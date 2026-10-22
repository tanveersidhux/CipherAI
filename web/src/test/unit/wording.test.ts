import { describe, it, expect } from 'vitest'
import * as Wording from '@/lib/content/wording'

describe('Wording and Lexical Invariant Tests', () => {
  const FORBIDDEN_PATTERNS = [
    /this link is safe/i,
    /100%\s*safe/i,
    /100%\s*legitimate/i,
    /no threat exists/i,
    /verified authentic/i,
    /safe to click/i,
    /safe to open/i,
    /guaranteed clean/i,
    /threat eliminated/i,
    /is completely safe/i,
  ]

  // Recursively collect all string values from the wording dictionary
  function extractAllStrings(obj: unknown): string[] {
    const results: string[] = []
    if (typeof obj === 'string') {
      results.push(obj)
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        results.push(...extractAllStrings(item))
      }
    } else if (obj !== null && typeof obj === 'object') {
      for (const value of Object.values(obj)) {
        results.push(...extractAllStrings(value))
      }
    }
    return results
  }

  const allStrings = extractAllStrings(Wording)

  it('scans all wording dictionary strings and verifies NO forbidden phrases exist', () => {
    expect(allStrings.length).toBeGreaterThan(15)

    for (const text of allStrings) {
      for (const pattern of FORBIDDEN_PATTERNS) {
        const matches = pattern.test(text)
        if (matches) {
          throw new Error(
            `Forbidden phrase matched by ${pattern} in wording string: "${text}"`
          )
        }
        expect(matches).toBe(false)
      }
    }
  })

  it('strictly defines the approved low-risk label', () => {
    expect(Wording.RISK_LEVEL_LABELS.low).toBe('Low risk indicators found')
  })

  it('strictly defines the approved mandatory disclaimer text', () => {
    expect(Wording.MANDATORY_DISCLAIMERS.lowRiskLimitation).toBe(
      'No strong indicators were found by CIPHER AI. This does not guarantee that the content is safe.'
    )
  })

  it('strictly defines the approved inconclusive label and notice', () => {
    expect(Wording.RISK_LEVEL_LABELS.inconclusive).toBe(
      'Inconclusive, not enough information'
    )
    expect(Wording.MANDATORY_DISCLAIMERS.inconclusiveNotice).toContain(
      'CIPHER AI could not perform a conclusive evaluation'
    )
    expect(Wording.MANDATORY_DISCLAIMERS.inconclusiveNotice).toContain(
      'This result does not imply that the content is benign.'
    )
  })
})
