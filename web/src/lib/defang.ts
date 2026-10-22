/**
 * CIPHER AI Defang and Display Safety Utilities
 * Sanitizes URLs to prevent accidental clicks and protocol handling,
 * and neutralizes layout and rendering attacks (BiDi overrides, zero-width characters).
 */

// Regex for Unicode Bidirectional Override and Embedding controls
const BIDI_REGEX = /[\u202A-\u202E\u2066-\u2069\u200E\u200F]/g

// Regex for Zero-Width Characters and non-printing formatters
const ZERO_WIDTH_REGEX = /[\u200B\uFEFF\u00AD]|\u200C|\u200D/g

/**
 * Neutralizes adversarial Unicode tricks (bidirectional spoofing and zero-width cloaking).
 */
export function sanitizeAdversarialText(text: string): string {
  if (!text) return ''
  return text
    .replace(BIDI_REGEX, '[BIDI]')
    .replace(ZERO_WIDTH_REGEX, '[ZW]')
}

/**
 * Converts a raw URL into a defanged representation:
 * - http -> hxxp
 * - https -> hxxps
 * - host/domain dots -> [.]
 * - Bidirectional / zero-width characters neutralized
 */
export function defangUrl(raw: string): string {
  if (!raw) return ''

  // 1. Sanitize any adversarial bidi or zero-width tricks first
  const sanitized = sanitizeAdversarialText(raw.trim())

  // 2. Defang scheme: http:// -> hxxp://, https:// -> hxxps://
  let defanged = sanitized.replace(/^https:\/\//i, 'hxxps://')
  defanged = defanged.replace(/^http:\/\//i, 'hxxp://')

  // 3. Defang host dots: Find the authority/host part between :// and the next / or ? or #
  const schemeMatch = defanged.match(/^(hxxps?:\/\/)([^/?#]+)(.*)$/i)
  if (schemeMatch) {
    const scheme = schemeMatch[1]
    const hostAndPort = schemeMatch[2]
    const rest = schemeMatch[3]

    // Defang dots in the host/authority portion (handles domain and IP addresses)
    const defangedHost = hostAndPort.replace(/\./g, '[.]')
    return `${scheme}${defangedHost}${rest}`
  }

  // If no scheme was present, defang any dot preceding a known TLD or between word chars
  return defanged.replace(/(\w+)\.(\w+)/g, '$1[.]$2')
}

/**
 * Truncates text safely for compact UI previews while keeping full text accessible.
 */
export function truncateForDisplay(
  text: string,
  maxLength: number = 70
): { display: string; isTruncated: boolean } {
  if (!text || text.length <= maxLength) {
    return { display: text, isTruncated: false }
  }
  const half = Math.floor((maxLength - 5) / 2)
  const display = `${text.slice(0, half)}...${text.slice(-half)}`
  return { display, isTruncated: true }
}
