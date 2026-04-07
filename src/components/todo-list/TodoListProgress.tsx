'use client'

import { motion } from 'framer-motion'

interface TodoListProgressProps {
  completedCount: number
  totalCount: number
  isVisible: boolean
}

export function TodoListProgress({ completedCount, totalCount, isVisible }: TodoListProgressProps) {
  if (!isVisible || totalCount === 0) return null

  const progress = (completedCount / totalCount) * 100

  return (
    <div className="flex flex-col gap-1.5 mb-1">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <span>Progress</span>
        <span>{completedCount}/{totalCount}</span>
      </div>
      <div className="h-1.5 w-full bg-foam rounded-full overflow-hidden relative">
        <motion.div 
          className="h-full bg-primary" 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <motion.div
          className="absolute top-0 bottom-0 bg-white/30 w-3 blur-[2px]"
          animate={{ left: `${progress}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}
