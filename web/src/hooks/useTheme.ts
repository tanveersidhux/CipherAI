import { useEffect, useState, useCallback } from 'react'
import type { ThemeMode } from '@/types/ui'

const STORAGE_KEY = 'cipher_theme'
const EVENT_KEY = 'cipher_theme_changed'

function getSavedTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark') return 'dark'
    if (stored === 'light') return 'light'
  } catch {
    // localStorage is unavailable or blocked (e.g. private window)
  }
  // User Requirement: default is strictly 'light' across all pages
  return 'light'
}

function applyThemeToDOM(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  // Strictly enforce: only 'dark' mode adds the dark class. Default is light.
  if (mode === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getSavedTheme())

  useEffect(() => {
    applyThemeToDOM(theme)

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeMode>
      if (customEvent.detail && (customEvent.detail === 'light' || customEvent.detail === 'dark')) {
        setThemeState(customEvent.detail)
        applyThemeToDOM(customEvent.detail)
      } else {
        const current = getSavedTheme()
        setThemeState(current)
        applyThemeToDOM(current)
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const next: ThemeMode = e.newValue === 'dark' ? 'dark' : 'light'
        setThemeState(next)
        applyThemeToDOM(next)
      }
    }

    window.addEventListener(EVENT_KEY, handleThemeChange)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(EVENT_KEY, handleThemeChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [theme])

  const setTheme = useCallback((newTheme: ThemeMode) => {
    const normalized: ThemeMode = newTheme === 'dark' ? 'dark' : 'light'
    setThemeState(normalized)
    applyThemeToDOM(normalized)
    try {
      localStorage.setItem(STORAGE_KEY, normalized)
    } catch {
      // Graceful fallback when localStorage quota is exceeded or storage disabled
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: normalized }))
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const nextTheme: ThemeMode = current === 'dark' ? 'light' : 'dark'
      applyThemeToDOM(nextTheme)
      try {
        localStorage.setItem(STORAGE_KEY, nextTheme)
      } catch {
        // Fallback
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: nextTheme }))
      }
      return nextTheme
    })
  }, [])

  return { theme, setTheme, toggleTheme }
}
