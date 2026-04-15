'use client'

import React from 'react'
import { DifficultyIndicator } from './DifficultyIndicator'
import { AchievementSummary as AchievementSummaryType } from '@/hooks/useDailyAchievementSummary'

interface Props {
  summary: AchievementSummaryType
  compact?: boolean
}

export function AchievementSummary({ summary, compact = false }: Props) {
  if (summary.total === 0) return (
    <span className="text-xs text-muted-foreground italic">Ready for your first win?</span>
  )

  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'} text-[11px] font-bold`}>
      {summary.high > 0 && (
        <div className="flex items-center gap-1">
          <DifficultyIndicator level="high" />
          <span>{summary.high}</span>
        </div>
      )}
      {summary.medium > 0 && (
        <div className="flex items-center gap-1">
          <DifficultyIndicator level="medium" />
          <span>{summary.medium}</span>
        </div>
      )}
      {summary.low > 0 && (
        <div className="flex items-center gap-1">
          <DifficultyIndicator level="low" />
          <span>{summary.low}</span>
        </div>
      )}
    </div>
  )
}
