import React from 'react'
import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { Button } from '@/components/ui/button'

export function TopBar() {
  return (
    <header className="lg:hidden sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border/40 bg-card/80 backdrop-blur-md px-4">
      <Logo />
      <div className="flex items-center gap-2">
        <Link to="/settings" aria-label="Open application settings">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  )
}
