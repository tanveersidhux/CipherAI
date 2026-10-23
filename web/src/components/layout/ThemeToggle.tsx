import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ThemeToggleProps {
  className?: string
  showLabels?: boolean
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className={cn(
        'relative rounded-md text-foreground transition-all duration-200 border-border/60 hover:bg-muted select-none flex items-center justify-center h-8 w-8 p-0 cursor-pointer',
        className
      )}
      aria-label={`Current theme is ${theme}. Click once to switch to ${isDark ? 'light' : 'dark'} mode.`}
      title={isDark ? 'Click to switch to Light mode' : 'Click to switch to Dark mode'}
    >
      {isDark ? (
        <Moon className="h-4 w-4 text-primary transition-transform duration-200 hover:rotate-12" aria-hidden="true" />
      ) : (
        <Sun className="h-4 w-4 text-amber-500 transition-transform duration-200 hover:rotate-45" aria-hidden="true" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
