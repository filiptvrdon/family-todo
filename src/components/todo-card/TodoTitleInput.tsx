'use client'

import { useState } from 'react'

interface Props {
  value: string
  onSave: (newValue: string) => void
  onCancel: () => void
}

export function TodoTitleInput({ value, onSave, onCancel }: Props) {
  const [currentValue, setCurrentValue] = useState(value)

  return (
    <input
      autoFocus
      value={currentValue}
      onChange={e => setCurrentValue(e.target.value)}
      onClick={e => e.stopPropagation()}
      onBlur={() => {
        if (currentValue.trim() && currentValue.trim() !== value) {
          onSave(currentValue.trim())
        } else {
          onCancel()
        }
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') {
          onCancel()
        }
      }}
      className="w-full text-sm font-medium rounded-lg px-2 py-0.5 focus:outline-none bg-card border-[1.5px] border-border text-foreground"
    />
  )
}
