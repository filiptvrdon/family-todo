'use client'

import { useDndMonitor, DragEndEvent } from '@dnd-kit/core'

interface DndMonitorProps {
  onDragEnd: (event: DragEndEvent) => void
}

export function DndMonitor({ onDragEnd }: DndMonitorProps) {
  useDndMonitor({ onDragEnd })
  return null
}
