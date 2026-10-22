import { describe, it, expect } from 'vitest'
import {
  validateUrlInput,
  validateMessageInput,
  URL_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
} from '@/lib/validation/scan-validation'

describe('Client-Side Validation Utilities', () => {
  describe('validateUrlInput', () => {
    it('rejects empty or whitespace-only input', () => {
      expect(validateUrlInput('').isValid).toBe(false)
      expect(validateUrlInput('   ').isValid).toBe(false)
    })

    it('rejects URLs exceeding 2048 characters', () => {
      const longUrl = 'https://example.com/' + 'x'.repeat(URL_MAX_LENGTH)
      const res = validateUrlInput(longUrl)
      expect(res.isValid).toBe(false)
      expect(res.error).toContain('maximum length')
    })

    it('rejects dangerous javascript: URI scheme', () => {
      const res = validateUrlInput('javascript:alert(1)')
      expect(res.isValid).toBe(false)
      expect(res.error).toContain('javascript:')
    })

    it('rejects data: URI scheme', () => {
      const res = validateUrlInput('data:text/html;base64,PHNjcmlwdD4=')
      expect(res.isValid).toBe(false)
      expect(res.error).toContain('data:')
    })

    it('rejects non-http/https schemes if scheme is present', () => {
      const res = validateUrlInput('ftp://files.example.com')
      expect(res.isValid).toBe(false)
      expect(res.error).toContain('Only HTTP and HTTPS')
    })

    it('accepts valid URLs with or without http/https scheme', () => {
      expect(validateUrlInput('https://example.com').isValid).toBe(true)
      expect(validateUrlInput('http://192.0.2.14:8080/login').isValid).toBe(true)
      expect(validateUrlInput('example.com/test').isValid).toBe(true)
      expect(validateUrlInput('   https://portal.example.test/path?q=1   ').isValid).toBe(true)
    })
  })

  describe('validateMessageInput', () => {
    it('rejects empty or whitespace-only messages', () => {
      expect(validateMessageInput('').isValid).toBe(false)
      expect(validateMessageInput('   \n\t  ').isValid).toBe(false)
    })

    it('accepts messages up to exactly 5000 characters', () => {
      const exact5000 = 'a'.repeat(MESSAGE_MAX_LENGTH)
      expect(validateMessageInput(exact5000).isValid).toBe(true)
    })

    it('rejects messages of 5001 characters', () => {
      const over5000 = 'a'.repeat(MESSAGE_MAX_LENGTH + 1)
      const res = validateMessageInput(over5000)
      expect(res.isValid).toBe(false)
      expect(res.error).toContain('maximum limit of 5000 characters')
    })

    it('accepts valid messages with normal formatting', () => {
      const msg = 'URGENT: Your account has been suspended. Please verify at https://example.test'
      expect(validateMessageInput(msg).isValid).toBe(true)
    })
  })
})
