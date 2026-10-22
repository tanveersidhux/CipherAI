import { describe, it, expect } from 'vitest'
import {
  validateUrlInput,
  normalizeUrlInput,
  validateMessageInput,
  defangUrl,
} from '../validation'

describe('Validation & Defanging Helpers', () => {
  describe('validateUrlInput', () => {
    it('rejects empty or whitespace-only URL strings', () => {
      expect(validateUrlInput('').isValid).toBe(false)
      expect(validateUrlInput('   ').isValid).toBe(false)
    })

    it('rejects URLs exceeding 2048 characters', () => {
      const longUrl = `https://example.com/${'a'.repeat(2035)}`
      expect(longUrl.length).toBeGreaterThan(2048)
      const res = validateUrlInput(longUrl)
      expect(res.isValid).toBe(false)
      expect(res.error).toContain('maximum length')
    })

    it('rejects dangerous javascript: and data: schemes with clear explanation', () => {
      const jsRes = validateUrlInput('javascript:alert(1)')
      expect(jsRes.isValid).toBe(false)
      expect(jsRes.error).toContain('javascript:')

      const dataRes = validateUrlInput('data:text/html,<script>alert(1)</script>')
      expect(dataRes.isValid).toBe(false)
      expect(dataRes.error).toContain('data:')
    })

    it('flags embedded user credentials in URL authority', () => {
      const credRes1 = validateUrlInput('https://admin:secret@malicious.test/login')
      expect(credRes1.isValid).toBe(false)
      expect(credRes1.error).toContain('embedded user credentials')

      const credRes2 = validateUrlInput('https://victim@phish.test')
      expect(credRes2.isValid).toBe(false)
      expect(credRes2.error).toContain('embedded user credentials')
    })

    it('rejects URLs containing ASCII control characters', () => {
      const ctrlRes = validateUrlInput('https://example.com/\x00evil')
      expect(ctrlRes.isValid).toBe(false)
      expect(ctrlRes.error).toContain('control characters')
    })

    it('accepts valid HTTP, HTTPS, IDN and punycode URLs', () => {
      expect(validateUrlInput('https://example.com/login').isValid).toBe(true)
      expect(validateUrlInput('http://sub.domain.test:8080/path?q=1').isValid).toBe(true)
      expect(validateUrlInput('https://xn--e1afmkfd.xn--p1ai/').isValid).toBe(true)
      // Scheme-less input accepted for convenience
      expect(validateUrlInput('portal.example.test/auth').isValid).toBe(true)
    })
  })

  describe('normalizeUrlInput', () => {
    it('prepends https:// when no protocol is provided', () => {
      expect(normalizeUrlInput('portal.example.test/auth')).toBe(
        'https://portal.example.test/auth'
      )
    })

    it('preserves existing http and https protocols', () => {
      expect(normalizeUrlInput('http://example.com')).toBe('http://example.com')
      expect(normalizeUrlInput('https://example.com')).toBe('https://example.com')
    })

    it('strips control characters and trims outer whitespace', () => {
      expect(normalizeUrlInput('  https://example.com/\x07test  ')).toBe(
        'https://example.com/test'
      )
    })
  })

  describe('validateMessageInput', () => {
    it('rejects empty or whitespace-only messages', () => {
      expect(validateMessageInput('').isValid).toBe(false)
      expect(validateMessageInput('   \n  ').isValid).toBe(false)
    })

    it('rejects messages exceeding 5000 characters', () => {
      const longMsg = 'a'.repeat(5001)
      const res = validateMessageInput(longMsg)
      expect(res.isValid).toBe(false)
      expect(res.error).toContain('5000 characters')
    })

    it('accepts valid message text within limits', () => {
      const res = validateMessageInput('URGENT: Your account was suspended. Click here to verify.')
      expect(res.isValid).toBe(true)
      expect(res.error).toBeNull()
    })
  })

  describe('defangUrl', () => {
    it('defangs http and https schemes to hxxp and hxxps', () => {
      expect(defangUrl('http://example.com')).toBe('hxxp://example[.]com')
      expect(defangUrl('https://example.com')).toBe('hxxps://example[.]com')
    })

    it('replaces dots in domain and IP with bracketed dots [.]', () => {
      expect(defangUrl('https://192.0.2.1/login')).toBe('hxxps://192[.]0[.]2[.]1/login')
      expect(defangUrl('https://sub.domain.example.com')).toBe(
        'hxxps://sub[.]domain[.]example[.]com'
      )
    })

    it('is strictly display-only and does not mutate raw inputs', () => {
      const original = 'https://phishing.example.test/secure'
      const defanged = defangUrl(original)
      expect(defanged).not.toBe(original)
      expect(original).toBe('https://phishing.example.test/secure')
    })
  })
})
