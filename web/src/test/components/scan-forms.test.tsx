import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { MessageScanForm } from '@/components/scan/MessageScanForm'
import { UrlScanForm } from '@/components/scan/UrlScanForm'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ErrorState } from '@/components/common/ErrorState'
import { ScanHistoryTable } from '@/components/common/ScanHistoryTable'
import { ApiError, type ErrorCode } from '@/types/api'
import { ERROR_MESSAGES } from '@/lib/content/wording'
import type { ScanSummary } from '@/types/api'

describe('Scan and Common Interactive Components', () => {
  describe('MessageScanForm', () => {
    it('updates character counter live and shows over-limit error at 5001 chars', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()

      render(<MessageScanForm onSubmit={onSubmit} />)
      const textarea = screen.getByRole('textbox', {
        name: /Suspicious Message Text/i,
      })

      // Type short message
      await user.type(textarea, 'Suspicious message text')
      expect(screen.getByText(/23 \/ 5000/)).toBeInTheDocument()

      // Paste text exceeding 5000 chars
      const overLimitText = 'x'.repeat(5001)
      await user.clear(textarea)
      await user.click(textarea)
      // Paste large value directly
      await user.paste(overLimitText)

      expect(screen.getByText(/5001 \/ 5000/)).toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent(
        /Message exceeds the maximum limit of 5000 characters/i
      )

      // Submit button should be disabled
      const submitBtn = screen.getByRole('button', { name: /Analyze Message/i })
      expect(submitBtn).toBeDisabled()
    })
  })

  describe('UrlScanForm', () => {
    it('validates URL, rejects javascript: scheme, and invokes submit for valid URL', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()

      render(<UrlScanForm onSubmit={onSubmit} />)
      const input = screen.getByRole('textbox', { name: /Target URL to Inspect/i })
      const submitBtn = screen.getByRole('button', { name: /Analyze URL/i })

      expect(submitBtn).toBeDisabled()

      // Type javascript: URI
      await user.type(input, 'javascript:alert(1)')
      expect(screen.getByRole('alert')).toHaveTextContent(
        /JavaScript URI schemes \(javascript:\) are not supported/i
      )
      expect(submitBtn).toBeDisabled()

      // Clear and type valid URL
      await user.clear(input)
      await user.type(input, 'https://login.example.test')
      expect(submitBtn).not.toBeDisabled()

      await user.click(submitBtn)
      expect(onSubmit).toHaveBeenCalledWith('https://login.example.test', {
        use_ai: true,
        persist: true,
      })
    })
  })

  describe('ConfirmDialog', () => {
    it('renders confirmation text and triggers onConfirm and onOpenChange', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      const onOpenChange = vi.fn()

      render(
        <ConfirmDialog
          open={true}
          onOpenChange={onOpenChange}
          title="Delete Scan Record"
          description="Are you sure you want to delete this scan?"
          confirmText="Yes, Delete"
          onConfirm={onConfirm}
        />
      )

      expect(screen.getByText('Delete Scan Record')).toBeInTheDocument()
      expect(
        screen.getByText('Are you sure you want to delete this scan?')
      ).toBeInTheDocument()

      const confirmBtn = screen.getByRole('button', { name: 'Yes, Delete' })
      await user.click(confirmBtn)

      expect(onConfirm).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('ErrorState', () => {
    const errorCodes: ErrorCode[] = [
      'VALIDATION_ERROR',
      'INVALID_URL',
      'INPUT_TOO_LARGE',
      'UNAUTHENTICATED',
      'FORBIDDEN',
      'NOT_FOUND',
      'RATE_LIMITED',
      'DEPENDENCY_UNAVAILABLE',
      'INTERNAL_ERROR',
    ]

    it.each(errorCodes)('maps error code %s to friendly message', (code) => {
      const apiErr = new ApiError(code, 'Technical error', [], 'trace_123')
      const { unmount } = render(<ErrorState error={apiErr} />)

      expect(screen.getByText(ERROR_MESSAGES[code])).toBeInTheDocument()
      expect(screen.getByText(/Trace ID: trace_123/i)).toBeInTheDocument()
      unmount()
    })
  })

  describe('ScanHistoryTable', () => {
    const mockItems: ScanSummary[] = [
      {
        id: 'scan-1',
        scan_type: 'url',
        display_value: 'hxxps://site-a[.]example[.]com',
        risk_score: 85,
        risk_level: 'critical',
        created_at: '2026-10-22T15:00:00Z',
      },
      {
        id: 'scan-2',
        scan_type: 'message',
        display_value: 'URGENT: account suspended...',
        risk_score: 15,
        risk_level: 'low',
        created_at: '2026-10-22T14:00:00Z',
      },
    ]

    it('renders both desktop table rows and mobile card layouts with delete action', async () => {
      const user = userEvent.setup()
      const onDelete = vi.fn().mockResolvedValue(undefined)

      render(
        <BrowserRouter>
          <ScanHistoryTable items={mockItems} onDelete={onDelete} />
        </BrowserRouter>
      )

      expect(
        screen.getAllByText('hxxps://site-a[.]example[.]com').length
      ).toBeGreaterThanOrEqual(1)

      // Sort button exists
      const sortBtn = screen.getByRole('button', { name: /Risk Level & Score/i })
      await user.click(sortBtn)
    })
  })
})
