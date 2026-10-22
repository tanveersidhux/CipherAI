import React from 'react'
import { Sun, Moon, Laptop } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ThemeToggleProps {
  className?: string
  showLabels?: boolean
}

export function ThemeToggle({ className, showLabels = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const getLabel = () => {
    if (theme === 'light') return 'Light Theme'
    if (theme === 'dark') return 'Dark Theme'
    return 'System Theme'
  }

  return (
    <Button
      variant="outline"
      size={showLabels ? 'default' : 'icon'}
      onClick={cycleTheme}
      className={cn('relative rounded-md text-foreground transition-colors', className)}
      aria-label={`Current theme is ${theme}. Click to switch theme mode.`}
      title={`Theme: ${getLabel()}`}
    >
      <Sun className="h-[1.15rem] w-[1.15rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 hidden [html:not(.dark)_&]:block" />
      <Moon className="h-[1.15rem] w-[1.15rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 hidden [html.dark_&]:block" />
      <span className="sr-only">Toggle theme</span>
      {showLabels && (
        <span className="ml-2 text-xs font-medium">
          {theme === 'system' ? (
            <span className="inline-flex items-center gap-1.5">
              <Laptop className="h-3.5 w-3.5" /> Auto
            </span>
          ) : (
            getLabel()
          )}
        </span>
      )}
    </Button>
  )
}
