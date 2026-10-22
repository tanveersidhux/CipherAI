import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface LoadingSkeletonProps {
  variant?: 'report' | 'table' | 'cards' | 'dashboard'
  message?: string
  className?: string
}

export function LoadingSkeleton({
  variant = 'report',
  message = 'Analyzing security indicators...',
  className,
}: LoadingSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('w-full space-y-6', className)}
    >
      <div className="flex items-center gap-3 text-sm text-primary font-medium animate-pulse">
        <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
        <span>{message}</span>
      </div>

      {variant === 'report' && (
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-8 w-3/4 max-w-lg" />
            <Skeleton className="h-4 w-48" />
          </div>

          {/* Risk Summary Gauge Skeleton */}
          <div className="rounded-lg border border-border/40 p-6 flex flex-col md:flex-row items-center gap-6 bg-card/40">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="space-y-3 flex-1 w-full">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>

          {/* AI Explanation Skeleton */}
          <div className="rounded-lg border border-border/40 p-6 space-y-3 bg-card/40">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>

          {/* Indicators Skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
          </div>
        </div>
      )}

      {variant === 'table' && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      )}

      {variant === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      )}

      {variant === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      )}
    </div>
  )
}
