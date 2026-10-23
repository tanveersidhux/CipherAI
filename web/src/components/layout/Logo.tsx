import React from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import logoSrc from '@/assets/logo.png'

export interface LogoProps {
  className?: string
  collapsed?: boolean
  showTagline?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ className, collapsed = false, showTagline = false, size = 'md' }: LogoProps) {
  const sizeMap = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-11 w-11',
  }

  return (
    <Link
      to="/"
      className={cn(
        'group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md transition-opacity hover:opacity-90',
        className
      )}
      aria-label="CIPHER AI - Return to homepage"
    >
      {/* Brand Shield & Chain Link Logo */}
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center rounded-xl p-0.5 overflow-hidden transition-transform group-hover:scale-105 shadow-xs',
          sizeMap[size]
        )}
      >
        <img
          src={logoSrc}
          alt="CipherAI Security Logo"
          className="h-full w-full object-contain drop-shadow-sm"
        />
      </div>

      {!collapsed && (
        <div className="flex flex-col">
          <div className="flex items-center tracking-tight">
            <span className="font-extrabold text-base tracking-wider text-foreground">
              CIPHER
            </span>
            <span className="ml-1 font-bold text-base text-primary">
              AI
            </span>
          </div>
          {showTagline && (
            <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[170px]">
              Understand threats.
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
