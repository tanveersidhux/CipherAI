import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home,
  Link as LinkIcon,
  MessageSquareWarning,
  History,
  BarChart3,
  Settings,
  FolderLock,
  FlaskConical,
} from 'lucide-react'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { cn } from '@/lib/utils'

// Feature flag for post-MVP cases module
export const ENABLE_CASES = false

const PRIMARY_NAV_ITEMS = [
  { title: 'Home', href: '/', icon: Home },
  { title: 'Scan URL', href: '/scan/url', icon: LinkIcon },
  { title: 'Scan Message', href: '/scan/message', icon: MessageSquareWarning },
  { title: 'History', href: '/history', icon: History },
  { title: 'Dashboard', href: '/dashboard', icon: BarChart3 },
]

export function SidebarNav() {
  const isDev = import.meta.env.DEV

  return (
    <aside
      className="hidden lg:flex w-60 flex-col justify-between border-r border-border/40 bg-card/60 backdrop-blur-md px-4 py-5 fixed inset-y-0 left-0 z-30 select-none"
      aria-label="Main application sidebar navigation"
    >
      <div className="flex flex-col space-y-6">
        {/* Brand Logo */}
        <div className="px-2">
          <Logo showTagline />
        </div>

        {/* Primary Navigation Links */}
        <nav className="flex flex-col space-y-1.5" aria-label="Primary navigation">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all min-h-[44px]',
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold shadow-xs border border-primary/20'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )}
                      aria-hidden="true"
                    />
                    <span>{item.title}</span>
                  </>
                )}
              </NavLink>
            )
          })}

          {ENABLE_CASES && (
            <NavLink
              to="/cases"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all min-h-[44px]',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <FolderLock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Cases (Dossiers)</span>
            </NavLink>
          )}
        </nav>
      </div>

      {/* Secondary & System Navigation */}
      <div className="flex flex-col space-y-3 pt-4 border-t border-border/40">
        {isDev && (
          <NavLink
            to="/dev/states"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-amber-500 hover:bg-amber-500/10 min-h-[36px]',
                isActive && 'bg-amber-500/15 font-semibold underline'
              )
            }
          >
            <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Dev State Switcher</span>
          </NavLink>
        )}

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all min-h-[44px]',
              isActive
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )
          }
        >
          <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Settings</span>
        </NavLink>

        <div className="flex items-center justify-between px-2 pt-1">
          <span className="text-xs text-muted-foreground">Appearance</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
