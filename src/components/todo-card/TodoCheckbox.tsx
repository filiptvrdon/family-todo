'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'

interface Props {
  completed: boolean
  completing: boolean
  onToggle: (e: React.MouseEvent) => void
  isOwner: boolean
}

export function TodoCheckbox({ completed, completing, onToggle, isOwner }: Props) {
  const isDone = completed || completing

  if (!isOwner) {
    return (
      <div
        className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-completion"
        style={{ borderColor: 'var(--color-completion)' }}
      >
        {completed && <Check size={11} className="text-white" strokeWidth={3} />}
      </div>
    )
  }

  return (
    <button
      onClick={onToggle}
      className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition relative overflow-hidden"
      style={
        isDone
          ? { borderColor: 'var(--color-completion)' }
          : { borderColor: 'var(--color-text-disabled)' }
      }
    >
      <motion.div
        className="absolute inset-0 bg-completion"
        initial={false}
        animate={isDone ? { scale: 1 } : { scale: 0 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
      />
      <AnimatePresence>
        {isDone && (
          <motion.div
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.12, delay: 0.08 }}
            className="z-10"
          >
            <Check size={11} className="text-white" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
