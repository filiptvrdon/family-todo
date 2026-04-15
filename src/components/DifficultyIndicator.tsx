'use client'

import React from 'react'

export type DifficultyLevel = 'low' | 'medium' | 'high'

interface DifficultyIndicatorProps {
  level: DifficultyLevel
  className?: string
  showLabel?: boolean
}

const CONFIG = {
  low: { 
    label: 'gentle', 
    dots: 1, 
    colorVar: '--color-difficulty-gentle'
  },
  medium: { 
    label: 'moderate', 
    dots: 2, 
    colorVar: '--color-difficulty-moderate'
  },
  high: { 
    label: 'involved', 
    dots: 3, 
    colorVar: '--color-difficulty-involved'
  },
}

export function DifficultyIndicator({ level, className = '', showLabel = false }: DifficultyIndicatorProps) {
  const config = CONFIG[level] || CONFIG.low
  const indicatorColor = `var(${config.colorVar})`
  
  if (showLabel) {
    return (
      <div 
        className={`inline-flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-muted/30 ${className}`} 
        title={config.label}
      >
        <span 
          className="text-[10px] font-bold tracking-tight leading-none lowercase transition-colors duration-200"
          style={{ color: indicatorColor }}
        >
          {config.label}
        </span>
        <div className="flex gap-1 items-center">
          {Array.from({ length: 3 }).map((_, i) => (
            <div 
              key={i} 
              className="w-1.5 h-1.5 rounded-full transition-colors duration-200"
              style={{ 
                backgroundColor: i < config.dots ? indicatorColor : 'color-mix(in srgb, var(--color-text-disabled), transparent 80%)'
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center gap-0.5 ${className}`} title={config.label}>
      <span 
        className="text-[8px] font-bold tracking-tight leading-none lowercase transition-colors duration-200"
        style={{ color: indicatorColor }}
      >
        {config.label}
      </span>
      <div className="flex gap-0.75 items-center">
        {Array.from({ length: 3 }).map((_, i) => (
          <div 
            key={i} 
            className="w-1.25 h-1.25 rounded-full transition-colors duration-200"
            style={{ 
              backgroundColor: i < config.dots ? indicatorColor : 'color-mix(in srgb, var(--color-text-disabled), transparent 100%)'
            }}
          />
        ))}
      </div>
    </div>
  )
}
