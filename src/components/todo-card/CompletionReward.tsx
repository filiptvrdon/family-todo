'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { QuestIcon } from '@/lib/questIcons'
import { QuestLink } from '@/lib/types'

interface Props {
  momentum: number
  activeQuest?: QuestLink
  isVisible: boolean
}

export function CompletionReward({ momentum, activeQuest, isVisible }: Props) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 1, 1, 0], y: -20 }}
          transition={{ duration: 1.2, times: [0, 0.2, 0.8, 1], delay: 0.3 }}
          className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none whitespace-nowrap"
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[11px] font-bold text-completion">
              +{momentum} Momentum
            </span>
            {activeQuest && (
              <div className="flex items-center gap-1 text-[10px] text-primary-dark font-medium">
                <QuestIcon name={activeQuest.icon} size={10} />
                {activeQuest.name}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
