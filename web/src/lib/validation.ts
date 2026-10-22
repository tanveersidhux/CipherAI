/**
 * Client-Side Validation Helpers and Display Defanging.
 * Covers URL parsing, normalization, scheme restrictions, credential detection,
 * and message limit enforcement.
 */

import { defangUrl, sanitizeAdversarialText } from './defang'

export interface ValidationResult {
  isValid: boolean
  error: string | null
}

export const URL_MAX_LENGTH = 2048
export const MESSAGE_MAX_LENGTH = 5000

// Control characters regex (ASCII 0-31 and 127)
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/

/**
 * Validates a candidate URL string client-side for UX safety.
 */
export function validateUrlInput(raw: string): ValidationResult {
  if (!raw || !raw.trim()) {
    return {
      isValid: false,
      error: 'Please enter a URL to analyze.',
    }
  }

  const trimmed = raw.trim()

  if (trimmed.length > URL_MAX_LENGTH) {
    return {
      isValid: false,
      error: `URL exceeds the maximum length of ${URL_MAX_LENGTH} characters.`,
    }
  }

  // Reject control characters
  if (CONTROL_CHARS_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'URL contains invalid control characters.',
    }
  }

  const lower = trimmed.toLowerCase()

  // Reject dangerous script / data schemes
  if (lower.startsWith('javascript:')) {
    return {
      isValid: false,
      error: 'JavaScript URI schemes (javascript:) are not supported.',
    }
  }

  if (lower.startsWith('data:')) {
    return {
      isValid: false,
      error: 'Data URIs (data:) are not supported.',
    }
  }

  if (lower.startsWith('vbscript:') || lower.startsWith('file:')) {
    return {
      isValid: false,
      error: 'Unsupported URI scheme. Please provide a standard web address.',
    }
  }

  // If scheme is present, must be http or https
  if (lower.includes('://')) {
    if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
      return {
        isValid: false,
        error: 'Only HTTP and HTTPS URLs are supported.',
      }
    }
  }

  // Detect and reject embedded credentials (user:pass@host or user@host)
  const authorityPart = lower.includes('://') ? lower.split('://')[1].split('/')[0] : lower.split('/')[0]
  if (authorityPart.includes('@')) {
    return {
      isValid: false,
      error: 'URLs with embedded user credentials (user@host) are rejected for safety.',
    }
  }

  return { isValid: true, error: null }
}

/**
 * Normalizes user-submitted URL text:
 * - Trims whitespace
 * - Removes control characters
 * - Prepends https:// if no scheme is provided
 */
export function normalizeUrlInput(raw: string): string {
  if (!raw) return ''
  const cleaned = raw.replace(CONTROL_CHARS_REGEX, '').trim()
  if (!cleaned) return ''

  if (!/^https?:\/\//i.test(cleaned)) {
    return `https://${cleaned}`
  }
  return cleaned
}

/**
 * Validates message content client-side.
 */
export function validateMessageInput(raw: string): ValidationResult {
  if (!raw || !raw.trim()) {
    return {
      isValid: false,
      error: 'Please enter or paste the message text to analyze.',
    }
  }

  if (raw.length > MESSAGE_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Message exceeds the maximum limit of ${MESSAGE_MAX_LENGTH} characters (current: ${raw.length}).`,
    }
  }

  return { isValid: true, error: null }
}

export { defangUrl, sanitizeAdversarialText }
