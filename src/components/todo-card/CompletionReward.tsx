'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { QuestIcon } from '@/lib/questIcons'
import { QuestLink } from '@/lib/types'
import { DifficultyIndicator } from '../DifficultyIndicator'

interface Props {
  energyLevel: 'low' | 'medium' | 'high'
  activeQuest?: QuestLink
  isVisible: boolean
}

export function CompletionReward({ energyLevel, activeQuest, isVisible }: Props) {
  const labelMap = {
    low: 'gentle',
    medium: 'moderate',
    high: 'involved'
  }
  const label = labelMap[energyLevel]
  const displayLabel = label.charAt(0).toUpperCase() + label.slice(1)
  
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
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-completion text-white shadow-sm">
              <div className="text-[8px] leading-none text-white/90">
                <DifficultyIndicator level={energyLevel} />
              </div>
              <span className="text-[10px] font-bold">
                {displayLabel} Completed!
              </span>
            </div>
            {activeQuest && (
              <div className="flex items-center gap-1 text-[10px] text-primary-dark font-medium bg-white/80 px-1.5 py-0.5 rounded-full backdrop-blur-sm shadow-xs mt-0.5">
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
