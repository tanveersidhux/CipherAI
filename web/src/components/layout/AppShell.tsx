import React from 'react'
import { Outlet } from 'react-router-dom'
import { SidebarNav } from './SidebarNav'
import { TopBar } from './TopBar'
import { MobileNav } from './MobileNav'

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* Skip to Main Content Link for Keyboard and Screen Reader Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-primary focus:text-primary-foreground focus:font-semibold focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Persistent Desktop Sidebar (240px) */}
      <SidebarNav />

      {/* Mobile / Tablet Header */}
      <TopBar />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-60 flex flex-col">
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 w-full max-w-[1100px] mx-auto px-4 py-6 md:px-8 md:py-8 pb-24 lg:pb-12 outline-none"
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (< 1024px) */}
      <MobileNav />
    </div>
  )
}
