'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface OnARollBadgeProps {
  active: boolean
}

export function OnARollBadge({ active }: OnARollBadgeProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 bg-white px-4 py-2 rounded-full shadow-lg border border-primary flex items-center gap-2 pointer-events-none"
        >
          <span className="text-sm font-bold text-primary flex items-center gap-1">
            🔥 You&apos;re on a roll
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
