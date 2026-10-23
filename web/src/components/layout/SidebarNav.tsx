import React from 'react'
import { NavLink, Link } from 'react-router-dom'
import {
  Home,
  Link as LinkIcon,
  MessageSquareWarning,
  History,
  BarChart3,
  Settings,
  FolderLock,
  FlaskConical,
  LogIn,
  LogOut,
  User,
  Mail,
} from 'lucide-react'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const PRIMARY_NAV_ITEMS = [
  { title: 'Home', href: '/', icon: Home },
  { title: 'Scan URL', href: '/scan/url', icon: LinkIcon },
  { title: 'Scan Message', href: '/scan/message', icon: MessageSquareWarning },
  { title: 'Scan Email', href: '/scan/email', icon: Mail },
  { title: 'History', href: '/history', icon: History },
  { title: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { title: 'Cases', href: '/cases', icon: FolderLock },
]

export function SidebarNav() {
  const isDev = import.meta.env.DEV
  const { user, signOut } = useAuth()

  return (
    <aside
      className="hidden lg:flex w-60 flex-col h-screen fixed inset-y-0 left-0 z-30 select-none border-r border-border/40 bg-card/75 backdrop-blur-md overflow-hidden"
      aria-label="Main application sidebar navigation"
    >
      {/* Pinned Top Brand Logo Header */}
      <div className="px-5 pt-5 pb-3 shrink-0">
        <Logo showTagline />
      </div>

      {/* Smoothly Scrollable Navigation Content Area */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2 space-y-6 custom-scrollbar">
        {/* Primary Navigation Links */}
        <nav className="flex flex-col space-y-1" aria-label="Primary navigation">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all min-h-[40px]',
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
        </nav>

        {/* User Auth & Secondary Navigation */}
        <div className="flex flex-col space-y-2.5 pt-3 border-t border-border/40">
          {user ? (
            <div className="rounded-lg bg-muted/40 p-2.5 border border-border/50 flex flex-col gap-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="truncate text-xs">
                  <span className="font-semibold block truncate text-foreground">{user.email ?? 'User'}</span>
                  <span className="text-[10px] text-muted-foreground">Authenticated</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void signOut()}
                className="w-full h-7 text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/30"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="default" size="sm" className="w-full gap-2 text-xs font-semibold h-8">
                <LogIn className="h-3.5 w-3.5" />
                Sign In to Save
              </Button>
            </Link>
          )}

          {isDev && (
            <NavLink
              to="/dev/states"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-1.5 text-xs font-medium text-amber-500 hover:bg-amber-500/10 min-h-[34px]',
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
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all min-h-[40px]',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Settings</span>
          </NavLink>
        </div>
      </div>

      {/* Pinned Bottom Footer with Appearance / Theme Toggle */}
      <div className="px-4 py-3 shrink-0 border-t border-border/40 bg-card/50">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground font-medium">Appearance</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}

