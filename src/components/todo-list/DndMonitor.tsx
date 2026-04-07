'use client'

import { useDndMonitor, DragEndEvent, DragStartEvent } from '@dnd-kit/core'

interface DndMonitorProps {
  onDragStart?: (event: DragStartEvent) => void
  onDragEnd: (event: DragEndEvent) => void
  onDragCancel?: () => void
}

export function DndMonitor({ onDragStart, onDragEnd, onDragCancel }: DndMonitorProps) {
  useDndMonitor({ onDragStart, onDragEnd, onDragCancel })
  return null
}
