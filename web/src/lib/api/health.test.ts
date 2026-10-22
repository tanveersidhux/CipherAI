import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getHealth, isHealthData, type HealthData } from './health'

const VALID_HEALTH_PAYLOAD: HealthData = {
  status: 'ok',
  app_version: '1.0.0',
  environment: 'development',
  timestamp: '2026-10-22T12:00:00Z',
  dependencies: {
    database: 'ok',
    llm: 'disabled',
  },
}

describe('Health Client and Validator', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isHealthData guard', () => {
    it('returns true for a fully valid health payload', () => {
      expect(isHealthData(VALID_HEALTH_PAYLOAD)).toBe(true)
    })

    it('returns false for null, primitives, or missing required fields', () => {
      expect(isHealthData(null)).toBe(false)
      expect(isHealthData('ok')).toBe(false)
      expect(isHealthData({ status: 'ok' })).toBe(false)
      expect(
        isHealthData({
          ...VALID_HEALTH_PAYLOAD,
          status: 'error',
        })
      ).toBe(false)
      expect(
        isHealthData({
          ...VALID_HEALTH_PAYLOAD,
          dependencies: { database: 'unknown_value', llm: 'disabled' },
        })
      ).toBe(false)
    })
  })

  describe('getHealth client', () => {
    it('returns ok: true when fetch returns 200 and valid json', async () => {
      const mockHeaders = new Headers()
      mockHeaders.set('X-Request-ID', 'trace-req-12345')

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        json: async () => VALID_HEALTH_PAYLOAD,
      } as unknown as Response)

      const result = await getHealth('http://localhost:8000')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.status).toBe('ok')
        expect(result.data.dependencies.database).toBe('ok')
        expect(result.request_id).toBe('trace-req-12345')
      }
    })

    it('returns ok: false with invalid_response when payload fails structural guard', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ random_garbage: true }),
      } as unknown as Response)

      const result = await getHealth('http://localhost:8000')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.reason).toBe('invalid_response')
      }
    })

    it('returns ok: false with http_error when status is non-200', async () => {
      const mockHeaders = new Headers()
      mockHeaders.set('X-Request-ID', 'err-trace-999')

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: mockHeaders,
        json: async () => ({ error: { code: 'INTERNAL_ERROR' } }),
      } as unknown as Response)

      const result = await getHealth('http://localhost:8000')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.reason).toBe('http_error')
        expect(result.status_code).toBe(500)
        expect(result.request_id).toBe('err-trace-999')
      }
    })

    it('returns ok: false with network when fetch rejects with a network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const result = await getHealth('http://localhost:8000')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.reason).toBe('network')
      }
    })

    it('returns ok: false with timeout when abort signal triggers', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError')
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError)

      const result = await getHealth('http://localhost:8000')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.reason).toBe('timeout')
      }
    })
  })
})
