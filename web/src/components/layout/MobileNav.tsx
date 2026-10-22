import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home,
  Link as LinkIcon,
  MessageSquareWarning,
  History,
  BarChart3,
  FolderLock,
  Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MOBILE_NAV_ITEMS = [
  { title: 'Home', href: '/', icon: Home },
  { title: 'URL', href: '/scan/url', icon: LinkIcon },
  { title: 'Message', href: '/scan/message', icon: MessageSquareWarning },
  { title: 'Email', href: '/scan/email', icon: Mail },
  { title: 'History', href: '/history', icon: History },
  { title: 'Cases', href: '/cases', icon: FolderLock },
  { title: 'Metrics', href: '/dashboard', icon: BarChart3 },
]


export function MobileNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border/40 bg-card/90 backdrop-blur-md px-2 flex items-center justify-around safe-area-inset-bottom"
      aria-label="Mobile navigation bar"
    >
      {MOBILE_NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-colors min-h-[44px] min-w-[44px]',
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'h-5 w-5 mb-0.5 transition-transform',
                    isActive ? 'scale-110 text-primary' : 'text-muted-foreground'
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
  )
}
