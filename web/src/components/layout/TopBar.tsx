import React from 'react'
import { Link } from 'react-router-dom'
import { Settings, LogIn, LogOut } from 'lucide-react'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'

export function TopBar() {
  const { user, signOut } = useAuth()

  return (
    <header className="lg:hidden sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border/40 bg-card/80 backdrop-blur-md px-4">
      <Logo />
      <div className="flex items-center gap-1.5">
        {user ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void signOut()}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
            title={`Signed in as ${user.email ?? 'user'}`}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        ) : (
          <Link to="/login">
            <Button variant="default" size="sm" className="h-8 px-2.5 text-xs gap-1">
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </Button>
          </Link>
        )}
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

