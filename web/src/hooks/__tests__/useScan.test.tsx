import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScanGeneric } from '../useScan'
import { useExplanation } from '../useExplanation'
import { ScanSessionProvider } from '@/context/ScanSessionProvider'
import { mockHighRiskReport, mockAIExplanationResponse } from '@/test/fixtures/reports'
import * as explanationApi from '@/lib/api/explanations'

describe('useScan Hook Suite', () => {
  it('manages state transition: idle -> loading -> success', async () => {
    const scanFn = vi.fn().mockResolvedValue(mockHighRiskReport)
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ScanSessionProvider>{children}</ScanSessionProvider>
    )

    const { result } = renderHook(() => useScanGeneric(scanFn), { wrapper })

    expect(result.current.status).toBe('idle')
    expect(result.current.data).toBeNull()

    let promise: Promise<any>
    act(() => {
      promise = result.current.run({ url: 'https://example.com' })
    })

    expect(result.current.status).toBe('loading')

    await act(async () => {
      await promise
    })

    expect(result.current.status).toBe('success')
    expect(result.current.data).toEqual(mockHighRiskReport)
  })

  it('manages error state on scan failure', async () => {
    const scanFn = vi.fn().mockRejectedValue(new Error('Connection failure'))
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ScanSessionProvider>{children}</ScanSessionProvider>
    )

    const { result } = renderHook(() => useScanGeneric(scanFn), { wrapper })

    await act(async () => {
      await result.current.run({ url: 'https://example.com' })
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).not.toBeNull()
    expect(result.current.data).toBeNull()
  })

  it('ignores stale response when run is called twice in rapid succession', async () => {
    let resolveFirst: (val: any) => void = () => {}
    const firstPromise = new Promise((res) => {
      resolveFirst = res
    })

    const secondReport = {
      ...mockHighRiskReport,
      report_id: 'rep_second_call',
    }

    const scanFn = vi.fn().mockImplementation((input: { id: number }) => {
      if (input.id === 1) return firstPromise
      return Promise.resolve(secondReport)
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ScanSessionProvider>{children}</ScanSessionProvider>
    )

    const { result } = renderHook(() => useScanGeneric(scanFn), { wrapper })

    // Fire first slow call
    act(() => {
      result.current.run({ id: 1 })
    })

    // Immediately fire second fast call
    await act(async () => {
      await result.current.run({ id: 2 })
    })

    expect(result.current.data?.report_id).toBe('rep_second_call')

    // Now resolve first call late
    await act(async () => {
      resolveFirst({
        ...mockHighRiskReport,
        report_id: 'rep_stale_first_call',
      })
    })

    // Assert stale response was ignored
    expect(result.current.data?.report_id).toBe('rep_second_call')
  })

  it('cancels in-flight scan and returns to idle without state pollution', async () => {
    let resolveSlow: (val: any) => void = () => {}
    const slowPromise = new Promise((res) => {
      resolveSlow = res
    })
    const scanFn = vi.fn().mockReturnValue(slowPromise)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ScanSessionProvider>{children}</ScanSessionProvider>
    )

    const { result } = renderHook(() => useScanGeneric(scanFn), { wrapper })

    act(() => {
      result.current.run({ url: 'https://example.com' })
    })
    expect(result.current.status).toBe('loading')

    act(() => {
      result.current.cancel()
    })
    expect(result.current.status).toBe('idle')

    // Resolve late
    await act(async () => {
      resolveSlow(mockHighRiskReport)
    })

    expect(result.current.data).toBeNull()
  })
})

describe('useExplanation Hook Suite', () => {
  it('requests explanation independently with retry capability', async () => {
    const spy = vi
      .spyOn(explanationApi, 'requestExplanation')
      .mockResolvedValueOnce(mockAIExplanationResponse)

    const { result } = renderHook(() => useExplanation())

    expect(result.current.status).toBe('idle')

    await act(async () => {
      await result.current.run(mockHighRiskReport)
    })

    expect(result.current.status).toBe('success')
    expect(result.current.data).toEqual(mockAIExplanationResponse)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('explanation failure retains error state and permits retry', async () => {
    const spy = vi
      .spyOn(explanationApi, 'requestExplanation')
      .mockRejectedValueOnce(new Error('AI provider offline'))
      .mockResolvedValueOnce(mockAIExplanationResponse)

    const { result } = renderHook(() => useExplanation())

    await act(async () => {
      await result.current.run(mockHighRiskReport)
    })

    expect(result.current.status).toBe('error')
    expect(result.current.data).toBeNull()

    // Retry
    await act(async () => {
      await result.current.retry()
    })

    expect(result.current.status).toBe('success')
    expect(result.current.data).toEqual(mockAIExplanationResponse)
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
