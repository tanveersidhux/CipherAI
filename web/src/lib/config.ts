/**
 * Validated frontend environment configuration.
 *
 * Reads and normalizes VITE_API_BASE_URL with strict protocol validation and
 * development-only localhost fallbacks.
 */

export interface ApiConfig {
  baseUrl: string
  isFallback: boolean
  error?: string
}

const DEFAULT_DEV_API_URL = 'http://localhost:8000'

/**
 * Validates and normalizes an API URL string.
 */
export function validateAndNormalizeApiUrl(rawUrl: string | undefined): ApiConfig {
  if (!rawUrl || !rawUrl.trim()) {
    if (import.meta.env.DEV) {
      return {
        baseUrl: DEFAULT_DEV_API_URL,
        isFallback: true,
      }
    }
    return {
      baseUrl: '',
      isFallback: false,
      error: 'VITE_API_BASE_URL is not configured in production.',
    }
  }

  const trimmed = rawUrl.trim()
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        baseUrl: import.meta.env.DEV ? DEFAULT_DEV_API_URL : '',
        isFallback: import.meta.env.DEV,
        error: `Invalid protocol '${parsed.protocol}'. API URL must use http: or https:.`,
      }
    }

    // Normalize trailing slashes
    const normalized = trimmed.replace(/\/+$/, '')
    return {
      baseUrl: normalized,
      isFallback: false,
    }
  } catch {
    return {
      baseUrl: import.meta.env.DEV ? DEFAULT_DEV_API_URL : '',
      isFallback: import.meta.env.DEV,
      error: `Malformed API URL: '${trimmed}'.`,
    }
  }
}

let cachedConfig: ApiConfig | null = null

export function getApiConfig(): ApiConfig {
  if (!cachedConfig) {
    cachedConfig = validateAndNormalizeApiUrl(import.meta.env.VITE_API_BASE_URL)
  }
  return cachedConfig
}

export function getApiBaseUrl(): string {
  return getApiConfig().baseUrl
}

export function isUsingDevFallback(): boolean {
  return getApiConfig().isFallback
}
