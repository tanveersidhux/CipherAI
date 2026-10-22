import type { ComponentType } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface NavItem {
  title: string
  href: string
  icon: ComponentType<{ className?: string }>
  badge?: string
  isExternal?: boolean
}

export type FormStatus = 'idle' | 'validating' | 'submitting' | 'success' | 'error'

export interface BreadcrumbItem {
  label: string
  href?: string
}
