import { describe, it, expect } from 'vitest'
import { defangUrl, sanitizeAdversarialText, truncateForDisplay } from '@/lib/defang'

describe('defangUrl and Display Safety Utility', () => {
  it('defangs standard http and https schemes', () => {
    expect(defangUrl('http://example.com')).toBe('hxxp://example[.]com')
    expect(defangUrl('https://example.com')).toBe('hxxps://example[.]com')
    expect(defangUrl('HTTPS://EXAMPLE.COM/PATH')).toBe('hxxps://EXAMPLE[.]COM/PATH')
  })

  it('defangs raw IP addresses and ports', () => {
    expect(defangUrl('http://192.0.2.14:8080/login')).toBe(
      'hxxp://192[.]0[.]2[.]14:8080/login'
    )
    expect(defangUrl('https://10.0.0.1:443/')).toBe('hxxps://10[.]0[.]0[.]1:443/')
  })

  it('preserves userinfo and query parameters', () => {
    const url = 'https://admin:secret@sub.example.com:8443/auth?key=val.1&token=xyz'
    const result = defangUrl(url)
    expect(result).toBe('hxxps://admin:secret@sub[.]example[.]com:8443/auth?key=val.1&token=xyz')
    expect(result).toContain('@')
  })

  it('neutralizes Unicode Bidirectional (BiDi) override attacks', () => {
    // URL containing Right-to-Left Override (\u202E) used to disguise executables
    const adversarialUrl = 'https://example.com/download_\u202Efdp.exe'
    const defanged = defangUrl(adversarialUrl)
    expect(defanged).not.toContain('\u202E')
    expect(defanged).toContain('[BIDI]')
  })

  it('neutralizes Zero-Width characters used for cloaking', () => {
    // Zero-width space (\u200B) inserted into hostname
    const cloakedUrl = 'https://ex\u200Bample.com/verify'
    const defanged = defangUrl(cloakedUrl)
    expect(defanged).not.toContain('\u200B')
    expect(defanged).toContain('[ZW]')
  })

  it('truncates very long strings safely for UI display', () => {
    const longString = 'hxxps://example[.]com/' + 'a'.repeat(300)
    const { display, isTruncated } = truncateForDisplay(longString, 60)
    expect(isTruncated).toBe(true)
    expect(display.length).toBeLessThan(longString.length)
    expect(display).toContain('...')
  })

  it('does not truncate short strings', () => {
    const shortString = 'hxxps://example[.]com'
    const { display, isTruncated } = truncateForDisplay(shortString, 80)
    expect(isTruncated).toBe(false)
    expect(display).toBe(shortString)
  })

  it('handles empty and null values gracefully', () => {
    expect(defangUrl('')).toBe('')
    expect(sanitizeAdversarialText('')).toBe('')
  })
})
