import { useEffect, useState, useCallback } from 'react'
import type { ThemeMode } from '@/types/ui'

const STORAGE_KEY = 'cipher_theme'

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored
      }
    } catch {
      // localStorage is unavailable or blocked (e.g. private window)
    }
    return 'system'
  })

  const applyTheme = useCallback((mode: ThemeMode) => {
    const root = document.documentElement
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches

    if (mode === 'dark' || (mode === 'system' && prefersDark)) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [])

  useEffect(() => {
    applyTheme(theme)

    // Listen for OS system theme changes if set to system
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => {
      if (theme === 'system') {
        applyTheme('system')
      }
    }

    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [theme, applyTheme])

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(STORAGE_KEY, newTheme)
    } catch {
      // Graceful fallback when localStorage quota is exceeded or storage disabled
    }
  }, [])

  return { theme, setTheme }
}
