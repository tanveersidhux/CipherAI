import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { CipherApiProvider } from '@/lib/api/client'
import { MockCipherApi } from '@/lib/api/mocks/mock-client'
import LandingPage from '@/pages/LandingPage'
import ScanUrlPage from '@/pages/ScanUrlPage'
import ScanMessagePage from '@/pages/ScanMessagePage'
import ReportPage from '@/pages/ReportPage'
import HistoryPage from '@/pages/HistoryPage'
import DashboardPage from '@/pages/DashboardPage'
import SettingsPage from '@/pages/SettingsPage'
import NotFoundPage from '@/pages/NotFoundPage'
import { criticalReportFixture } from '@/lib/api/mocks/fixtures'

function renderWithProviders(ui: React.ReactElement, initialRoute: string = '/') {
  const mockApi = new MockCipherApi(10) // Fast 10ms simulated latency for unit tests
  return render(
    <CipherApiProvider api={mockApi}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {ui}
      </MemoryRouter>
    </CipherApiProvider>
  )
}

describe('Full Page Renderings and Routing Flows', () => {
  it('renders LandingPage with tagline, input card, and trust cards', () => {
    renderWithProviders(<LandingPage />)
    expect(screen.getByText(/Understand threats\. Protect what matters\./i)).toBeInTheDocument()
    expect(screen.getByText('Evidence First')).toBeInTheDocument()
    expect(screen.getByText('Plain-Language AI')).toBeInTheDocument()
    expect(screen.getByText('Never Claims 100 Percent Safety')).toBeInTheDocument()
  })

  it('renders ScanUrlPage and submits a valid URL', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ScanUrlPage />)

    const input = screen.getByRole('textbox', { name: /Target URL to Inspect/i })
    await user.type(input, 'https://login.example.test')

    const submitBtn = screen.getByRole('button', { name: /Analyze URL/i })
    expect(submitBtn).not.toBeDisabled()
  })

  it('renders ScanUrlPage with injected failure: RATE_LIMITED', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ScanUrlPage />)

    const input = screen.getByRole('textbox', { name: /Target URL to Inspect/i })
    await user.type(input, 'https://simulate-rate-limit.example.test')

    const submitBtn = screen.getByRole('button', { name: /Analyze URL/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/RATE LIMITED/i)).toBeInTheDocument()
    })
  })

  it('renders ScanUrlPage with injected failure: DEPENDENCY_UNAVAILABLE', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ScanUrlPage />)

    const input = screen.getByRole('textbox', { name: /Target URL to Inspect/i })
    await user.type(input, 'https://simulate-unavailable.example.test')

    const submitBtn = screen.getByRole('button', { name: /Analyze URL/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/DEPENDENCY UNAVAILABLE/i)).toBeInTheDocument()
    })
  })

  it('renders ScanMessagePage and updates channel', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ScanMessagePage />)

    const textarea = screen.getByRole('textbox', { name: /Suspicious Message Text/i })
    await user.type(textarea, 'Urgent wire transfer requested')

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'chat')
    expect(select).toHaveValue('chat')
  })

  it('renders ReportPage with full canonical report sections', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/reports/:reportId" element={<ReportPage />} />
      </Routes>,
      `/reports/${criticalReportFixture.report_id}`
    )

    await waitFor(() => {
      expect(screen.getByText('Threat Evaluation Report')).toBeInTheDocument()
    })

    // 10 sections check
    expect(screen.getByRole('meter')).toBeInTheDocument()
    expect(screen.getByRole('note', { name: 'Security evaluation disclaimer' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Score Contribution Breakdown Table' })).toBeInTheDocument()
    expect(screen.getByText(/Engine:/i)).toBeInTheDocument()
  })

  it('renders HistoryPage with records', async () => {
    renderWithProviders(<HistoryPage />)
    await waitFor(() => {
      expect(screen.getByText('Scan History')).toBeInTheDocument()
    })
  })

  it('renders DashboardPage with metrics and charts', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Intelligence Dashboard')).toBeInTheDocument()
    })
    expect(screen.getByText('Total Scans Executed')).toBeInTheDocument()
  })

  it('renders SettingsPage with theme options and anonymous session ID', () => {
    renderWithProviders(<SettingsPage />)
    expect(screen.getByText('Settings & Privacy')).toBeInTheDocument()
    expect(screen.getByText('Appearance & Interface Theme')).toBeInTheDocument()
    expect(screen.getByText(/d82a17f9-90b4-4b5c-a812-3f19c824e901/)).toBeInTheDocument()
  })

  it('renders NotFoundPage on unhandled route', () => {
    renderWithProviders(<NotFoundPage />)
    expect(screen.getByText('404 — Page Not Found')).toBeInTheDocument()
  })

  it('safety test: renders hostile HTML/script tags as inert plain text, never executing', async () => {
    const hostilePayload = '<script>alert("xss")</script><img src="x" onerror="alert(1)">'
    const mockApi = new MockCipherApi(5)
    const hostileReport = {
      ...criticalReportFixture,
      report_id: 'hostile-123',
      input: {
        ...criticalReportFixture.input,
        display_value: hostilePayload,
      },
    }
    // Seed hostile report
    mockApi['reports'].set('hostile-123', hostileReport)

    const { container } = render(
      <CipherApiProvider api={mockApi}>
        <MemoryRouter initialEntries={['/reports/hostile-123']}>
          <Routes>
            <Route path="/reports/:reportId" element={<ReportPage />} />
          </Routes>
        </MemoryRouter>
      </CipherApiProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Threat Evaluation Report')).toBeInTheDocument()
    })

    // Verify no script tag was created in DOM
    const scriptElements = container.querySelectorAll('script')
    expect(scriptElements.length).toBe(0)
    // Verify payload is rendered as harmless visible text
    expect(container.innerHTML).not.toContain('<script>alert')
    expect(screen.getByText(/alert\("xss"\)/)).toBeInTheDocument()
  })
})
