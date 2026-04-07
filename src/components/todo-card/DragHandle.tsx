'use client'

import { GripVertical } from 'lucide-react'
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'

interface Props {
  isVisible: boolean
  listeners?: SyntheticListenerMap
}

export function DragHandle({ isVisible, listeners }: Props) {
  if (!isVisible) return null

  return (
    <div
      {...listeners}
      onClick={e => e.stopPropagation()}
      className="shrink-0 text-text-disabled cursor-grab active:cursor-grabbing touch-none"
    >
      <GripVertical size={14} />
    </div>
  )
}
