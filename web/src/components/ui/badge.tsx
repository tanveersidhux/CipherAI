import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow',
        outline: 'text-foreground',
        riskLow:
          'border-risk-low-border bg-risk-low text-risk-low-foreground font-medium',
        riskMedium:
          'border-risk-medium-border bg-risk-medium text-risk-medium-foreground font-medium',
        riskHigh:
          'border-risk-high-border bg-risk-high text-risk-high-foreground font-medium',
        riskCritical:
          'border-risk-critical-border bg-risk-critical text-risk-critical-foreground font-medium',
        riskInconclusive:
          'border-risk-inconclusive-border bg-risk-inconclusive text-risk-inconclusive-foreground font-medium',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
