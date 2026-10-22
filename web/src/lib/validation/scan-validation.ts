/**
 * Client-Side Input Validation Utilities (UX Only)
 * NOTE: Client validation is strictly an interactive usability aid.
 * The backend FastAPI service remains the authoritative validator.
 */

export interface ValidationResult {
  isValid: boolean
  error: string | null
}

export const URL_MAX_LENGTH = 2048
export const MESSAGE_MAX_LENGTH = 5000

/**
 * Validates a submitted URL string for usability.
 */
export function validateUrlInput(raw: string): ValidationResult {
  const trimmed = raw.trim()

  if (!trimmed) {
    return {
      isValid: false,
      error: 'Please enter a URL to analyze.',
    }
  }

  if (trimmed.length > URL_MAX_LENGTH) {
    return {
      isValid: false,
      error: `URL exceeds the maximum length of ${URL_MAX_LENGTH} characters.`,
    }
  }

  // Reject dangerous script/data pseudoprotocols immediately
  const lower = trimmed.toLowerCase()
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

  return { isValid: true, error: null }
}

/**
 * Validates a submitted message text for social engineering analysis.
 */
export function validateMessageInput(raw: string): ValidationResult {
  const trimmed = raw.trim()

  if (!trimmed) {
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
