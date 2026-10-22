import React from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface LogoProps {
  className?: string
  collapsed?: boolean
  showTagline?: boolean
}

export function Logo({ className, collapsed = false, showTagline = false }: LogoProps) {
  return (
    <Link
      to="/"
      className={cn(
        'group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md transition-opacity hover:opacity-90',
        className
      )}
      aria-label="CIPHER AI - Return to homepage"
    >
      {/* Original Geometric Shield & Cipher Node SVG Glyph */}
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-sm transition-transform group-hover:scale-105">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          aria-hidden="true"
        >
          {/* Outer Shield Boundary */}
          <path
            d="M16 3L5 7V15C5 21.6 9.7 27.7 16 29C22.3 27.7 27 21.6 27 15V7L16 3Z"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Central Cryptographic Cipher Core */}
          <circle cx="16" cy="14" r="2.8" fill="currentColor" />
          {/* Analytical Ray Paths */}
          <path
            d="M16 17.5V22.5M12.5 14H9.5M19.5 14H22.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
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
