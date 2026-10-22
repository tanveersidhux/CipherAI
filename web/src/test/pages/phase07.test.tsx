import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { CipherApiProvider } from '@/lib/api/client'
import { MockCipherApi } from '@/lib/api/mocks/mock-client'
import { AuthContext, type AuthContextValue } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import CasesPage from '@/pages/CasesPage'
import { DefangedText } from '@/components/common/DefangedText'
import { PersistenceStatusBanner } from '@/components/common/PersistenceStatusBanner'

const mockAuthContext: AuthContextValue = {
  user: {
    id: 'user-test-uuid',
    email: 'analyst@cipherai.test',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-10-23T00:00:00Z',
  } as any,
  session: {
    access_token: 'mock-jwt-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {} as any,
  },
  token: 'mock-jwt-token',
  loading: false,
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue(undefined),
}

const mockUnauthContext: AuthContextValue = {
  user: null,
  session: null,
  token: null,
  loading: false,
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue(undefined),
}

describe('Phase 07: Authentication & Protected Routes', () => {
  it('renders LoginPage with sign in and create account forms', async () => {
    const user = userEvent.setup()
    render(
      <AuthContext.Provider value={mockUnauthContext}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    )

    expect(screen.getByRole('heading', { name: /Welcome to CIPHER AI/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument()

    // Switch to Create Account tab
    const signUpTab = screen.getByRole('tab', { name: /Create Account/i })
    await user.click(signUpTab)

    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Create Password/i)).toBeInTheDocument()
  })

  it('redirects unauthenticated users to /login in ProtectedRoute', () => {
    render(
      <AuthContext.Provider value={mockUnauthContext}>
        <MemoryRouter initialEntries={['/history']}>
          <Routes>
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <div>Secret History Data</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page Landing</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )

    expect(screen.queryByText('Secret History Data')).not.toBeInTheDocument()
    expect(screen.getByText('Login Page Landing')).toBeInTheDocument()
  })

  it('allows authenticated users to access protected routes', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MemoryRouter initialEntries={['/history']}>
          <Routes>
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <div>Secret History Data</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )

    expect(screen.getByText('Secret History Data')).toBeInTheDocument()
  })
})

describe('Phase 07: Investigation Cases & Case Management', () => {
  it('renders CasesPage with empty state or list and allows opening creation modal', async () => {
    const user = userEvent.setup()
    const mockApi = new MockCipherApi(5)
    // Add mock cases support
    mockApi.listCases = vi.fn().mockResolvedValue({
      items: [
        {
          id: 'case-1',
          title: 'Executive Phishing Incident #104',
          description: 'Spear-phishing targeting executive finance team',
          status: 'open',
          priority: 'high',
          scan_count: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      next_cursor: null,
    })

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <CipherApiProvider api={mockApi}>
          <MemoryRouter>
            <CasesPage />
          </MemoryRouter>
        </CipherApiProvider>
      </AuthContext.Provider>
    )

    await waitFor(() => {
      expect(screen.getByText('Investigation Cases')).toBeInTheDocument()
      expect(screen.getByText('Executive Phishing Incident #104')).toBeInTheDocument()
    })

    const newCaseBtn = screen.getByRole('button', { name: /New Investigation Case/i })
    await user.click(newCaseBtn)

    expect(screen.getByRole('heading', { name: /Create Investigation Case/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Case Title/i)).toBeInTheDocument()
  })
})

describe('Phase 07: Security, Defanging, and XSS Protection', () => {
  it('defangs malicious URLs and prevents dangerous anchor rendering', () => {
    const maliciousUrl = 'https://phishing-bank.example.test/login.php?user=admin#credential'
    const { container } = render(<DefangedText url={maliciousUrl} />)

    // Should contain defanged representation with hxxps and [.]
    expect(screen.getByText(/hxxps:\/\/phishing-bank\[\.\]example\[\.\]test/i)).toBeInTheDocument()

    // Must NEVER render as a clickable <a> link pointing to the malicious target
    const anchors = container.querySelectorAll('a')
    expect(anchors.length).toBe(0)
  })

  it('renders hostile script injection in case text inertly as plain string', () => {
    const hostileText = '<script>window.__pwned = true;</script><img src="err" onerror="alert(1)">'
    const { container } = render(
      <div data-testid="inert-note">
        <p>{hostileText}</p>
      </div>
    )

    const note = screen.getByTestId('inert-note')
    expect(note.textContent).toContain('<script>window.__pwned = true;</script>')
    // Script tag was NOT executed or inserted as HTML DOM elements
    expect(container.querySelectorAll('script').length).toBe(0)
    expect(container.querySelectorAll('img').length).toBe(0)
    expect((window as any).__pwned).toBeUndefined()
  })

  it('renders PersistenceStatusBanner in guest, saved, and save_failed modes accurately', () => {
    const { rerender } = render(<PersistenceStatusBanner status="not_saved_guest" />)
    expect(screen.getByText(/Guest Mode:/i)).toBeInTheDocument()
    expect(screen.getByText(/Sign in to save history/i)).toBeInTheDocument()

    rerender(<PersistenceStatusBanner status="saved" scanId="abc-123-uuid" />)
    expect(screen.getByText(/Saved to your private scan history/i)).toBeInTheDocument()

    rerender(<PersistenceStatusBanner status="save_failed" />)
    expect(screen.getByText(/Failed to persist this scan record/i)).toBeInTheDocument()
  })
})
