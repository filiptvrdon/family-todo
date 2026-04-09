'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /** 0–100 */
  value?: number
  /** Override the fill colour. Defaults to var(--color-primary). */
  fillColor?: string
  /** Show the leading-edge shimmer (same as SubtaskProgressBar). Default true. */
  shimmer?: boolean
}

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, value = 0, fillColor, shimmer = true, ...props }, ref) => {
    const pct = Math.min(100, Math.max(0, value))

    return (
      <ProgressPrimitive.Root
        ref={ref}
        className={cn('relative h-1 w-full overflow-hidden rounded-full bg-foam', className)}
        {...props}
      >
        <ProgressPrimitive.Indicator asChild>
          <motion.div
            className="h-full rounded-full"
            style={{ background: fillColor ?? 'var(--color-primary)' }}
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </ProgressPrimitive.Indicator>

        {shimmer && pct > 0 && pct < 100 && (
          <motion.div
            className="absolute top-0 bottom-0 w-2 blur-[1px] bg-white/30 pointer-events-none"
            initial={false}
            animate={{ left: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )}
      </ProgressPrimitive.Root>
    )
  }
)
Progress.displayName = 'Progress'

export { Progress }
