import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch } from '../client'
import { ApiError, normalizeApiError } from '../errors'

describe('API Client & Error Normalization', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('successfully fetches and parses JSON response with trace ID', async () => {
    const mockData = { status: 'ok', count: 42 }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/json',
        'X-Request-ID': 'req_test_123',
      }),
      json: async () => mockData,
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiFetch<typeof mockData>('/api/v1/test')
    expect(result.data).toEqual(mockData)
    expect(result.requestId).toBe('req_test_123')
  })

  it('normalizes standard CIPHER AI error envelope on 400', async () => {
    const envelope = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid payload structure.',
        details: [{ field: 'url', issue: 'Missing protocol.' }],
        request_id: 'req_env_400',
      },
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers({
        'Content-Type': 'application/json',
        'X-Request-ID': 'req_env_400',
      }),
      json: async () => envelope,
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiFetch('/api/v1/scans/url')).rejects.toThrow(ApiError)
    try {
      await apiFetch('/api/v1/scans/url')
    } catch (err) {
      const apiErr = err as ApiError
      expect(apiErr.code).toBe('VALIDATION_ERROR')
      expect(apiErr.message).toBe('Invalid payload structure.')
      expect(apiErr.details).toHaveLength(1)
      expect(apiErr.details[0].field).toBe('url')
      expect(apiErr.requestId).toBe('req_env_400')
      expect(apiErr.status).toBe(400)
    }
  })

  it('normalizes default FastAPI 422 detail array format', async () => {
    const fastapiDetail = {
      detail: [
        {
          loc: ['body', 'url'],
          msg: 'URL format is invalid.',
          type: 'value_error',
        },
      ],
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      headers: new Headers({
        'Content-Type': 'application/json',
        'X-Request-ID': 'req_fastapi_422',
      }),
      json: async () => fastapiDetail,
    })
    vi.stubGlobal('fetch', fetchMock)

    try {
      await apiFetch('/api/v1/scans/url')
    } catch (err) {
      const apiErr = err as ApiError
      expect(apiErr.code).toBe('VALIDATION_ERROR')
      expect(apiErr.message).toBe('URL format is invalid.')
      expect(apiErr.details).toHaveLength(1)
      expect(apiErr.details[0].field).toBe('url')
      expect(apiErr.status).toBe(422)
    }
  })

  it('captures Retry-After header on 429 RATE_LIMITED response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({
        'Content-Type': 'application/json',
        'X-Request-ID': 'req_rate_limit',
        'Retry-After': '15',
      }),
      json: async () => ({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests.',
          details: [],
          request_id: 'req_rate_limit',
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    try {
      await apiFetch('/api/v1/scans/url')
    } catch (err) {
      const apiErr = err as ApiError
      expect(apiErr.code).toBe('RATE_LIMITED')
      expect(apiErr.status).toBe(429)
      expect(apiErr.retryAfterSeconds).toBe(15)
    }
  })

  it('handles 413 INPUT_TOO_LARGE payload response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
      headers: new Headers({
        'Content-Type': 'application/json',
        'X-Request-ID': 'req_413_large',
      }),
      json: async () => ({
        error: {
          code: 'INPUT_TOO_LARGE',
          message: 'Payload exceeds maximum limit.',
          details: [],
          request_id: 'req_413_large',
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    try {
      await apiFetch('/api/v1/scans/url')
    } catch (err) {
      const apiErr = err as ApiError
      expect(apiErr.code).toBe('INPUT_TOO_LARGE')
      expect(apiErr.status).toBe(413)
    }
  })

  it('handles 500 internal server error cleanly without stack leakage', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({
        'Content-Type': 'application/json',
        'X-Request-ID': 'req_500_err',
      }),
      json: async () => ({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error occurred.',
          details: [],
          request_id: 'req_500_err',
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    try {
      await apiFetch('/api/v1/scans/url')
    } catch (err) {
      const apiErr = err as ApiError
      expect(apiErr.code).toBe('INTERNAL_ERROR')
      expect(apiErr.status).toBe(500)
    }
  })

  it('handles HTML gateway error (502/504 non-JSON) gracefully', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 504,
      statusText: 'Gateway Timeout',
      headers: new Headers({
        'Content-Type': 'text/html',
        'X-Request-ID': 'req_504_html',
      }),
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON at position 0')
      },
    })
    vi.stubGlobal('fetch', fetchMock)

    try {
      await apiFetch('/api/v1/scans/url')
    } catch (err) {
      const apiErr = err as ApiError
      expect(apiErr.code).toBe('INTERNAL_ERROR')
      expect(apiErr.status).toBe(504)
    }
  })

  it('normalizes TypeError network failure into NETWORK_ERROR ApiError', () => {
    const networkErr = new TypeError('Failed to fetch')
    const normalized = normalizeApiError(networkErr)
    expect(normalized.code).toBe('NETWORK_ERROR')
    expect(normalized.status).toBe(0)
  })

  it('truncates very long error messages to 200 characters and strips HTML', () => {
    const veryLongMsg = `<script>alert(1)</script>${'A'.repeat(300)}`
    const normalized = normalizeApiError(veryLongMsg)
    expect(normalized.message.length).toBeLessThanOrEqual(200)
    expect(normalized.message).not.toContain('<script>')
    expect(normalized.message.endsWith('...')).toBe(true)
  })

  it('fails with INVALID_RESPONSE when runtime guard returns false', async () => {
    const malformedData = { someRandomProp: 123 }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => malformedData,
    })
    vi.stubGlobal('fetch', fetchMock)

    const guard = vi.fn().mockReturnValue(false)

    await expect(apiFetch('/api/v1/scans/url', { guard })).rejects.toThrow(ApiError)
    try {
      await apiFetch('/api/v1/scans/url', { guard })
    } catch (err) {
      const apiErr = err as ApiError
      expect(apiErr.code).toBe('INVALID_RESPONSE')
    }
  })
})
