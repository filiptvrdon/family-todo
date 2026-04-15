'use client'

import { useState } from 'react'
import { Todo, QuestLink } from '@/lib/types'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { motion } from 'framer-motion'

// Sub-components
import { CompletionReward } from './todo-card/CompletionReward'
import { DragHandle } from './todo-card/DragHandle'
import { TodoCheckbox } from './todo-card/TodoCheckbox'
import { TodoDisplay } from './todo-card/TodoDisplay'
import { SubtaskProgressBar } from './todo-card/SubtaskProgressBar'
import { TodoMetadata } from './todo-card/TodoMetadata'

interface Props {
  todo: Todo
  isOwner: boolean
  onToggle: (t: Todo) => void
  onOpen: (t: Todo) => void
  onEdit?: (id: string, newTitle: string) => void
  isSortable?: boolean
  isDraggable?: boolean
  isDroppable?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
  isSubtaskMode?: boolean
  quests?: QuestLink[]
  streamingNudge?: string
  parentTitle?: string
}

export default function TodoCard({
  todo,
  isOwner,
  onToggle,
  onOpen,
  isSortable = false,
  isDraggable = false,
  isDroppable = false,
  isSubtaskMode = false,
  quests,
  parentTitle,
}: Props) {
  const [completing, setCompleting] = useState(false)

  // Sortable hook
  const sortable = useSortable({
    id: todo.id,
    disabled: !isSortable || !isOwner || isSubtaskMode,
    data: isDraggable ? { source: 'todo-column', todo } : undefined,
  })

  // Draggable hook (fallback when sorting is disabled by subtask mode or list type)
  const draggable = useDraggable({
    id: todo.id,
    data: { source: 'todo-column', todo },
    disabled: !isDraggable || (isSortable && !isSubtaskMode) || todo.completed,
  })

  // Droppable hook (for creating sub-tasks)
  const droppable = useDroppable({
    id: `todo-${todo.id}`,
    data: { type: 'todo-drop-target', todoId: todo.id },
    disabled: !isDroppable,
  })

  function handleToggle(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation()
    if (!todo.completed && !completing) {
      setCompleting(true)
      // Sequence timing:
      // 0-120ms: Checkbox (Step 1)
      // 120-300ms: Settling (Step 2)
      // 300-800ms: Reward (Step 3)
      // 800ms+: Exit (Step 4) - handled by parent onToggle
      setTimeout(() => {
        onToggle(todo)
        // Reset completing state after enough time for rewards to finish
        setTimeout(() => setCompleting(false), 1000)
      }, 850)
    } else if (todo.completed) {
      setCompleting(false)
      onToggle(todo)
    }
  }

  const isDragging = sortable.isDragging || draggable.isDragging
  const style: React.CSSProperties = {
    // Only set opacity via style when dragging — otherwise let Framer Motion own it
    // to avoid conflicting with completing/exit animations
    opacity: isDragging ? 0.4 : undefined,
    // Guard DnD transform during completion/exit: when AnimatePresence keeps the element
    // alive after it leaves SortableContext.items, DnD kit can apply a correction transform
    // with an x component that causes a visible leftward slide.
    transform: (completing || todo.completed) ? undefined : CSS.Transform.toString(sortable.transform),
    // Only apply DnD transition during active drag; Framer Motion handles all other transitions
    transition: isDragging ? sortable.transition : undefined,
  }

  // Combine refs
  const setNodeRef = (node: HTMLElement | null) => {
    sortable.setNodeRef(node)
    if (isDraggable) draggable.setNodeRef(node)
    if (isDroppable) droppable.setNodeRef(node)
  }

  const isOver = droppable.isOver

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(todo)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onOpen(todo)}
      initial={false}
      whileTap={{ scale: 0.98, boxShadow: 'none' }}
      animate={completing ? {
        scale: 0.98,
        opacity: 0.7,
        backgroundColor: 'var(--color-foam)'
      } : { opacity: todo.completed ? 0.5 : 1 }}
      transition={{ 
        duration: completing ? 0.18 : 0.1, 
        delay: completing ? 0.12 : 0 
      }}
      className={`w-full min-w-0 rounded-xl px-3 py-2 flex items-center gap-2.5 cursor-pointer transition-colors bg-card border shadow-[var(--shadow-card)] group relative ${
        isOver ? 'ring-2 ring-primary border-primary bg-primary/5' : 'border-border'
      }`}
    >
      <CompletionReward 
        energyLevel={todo.energy_level || 'low'} 
        activeQuest={quests?.[0]} 
        isVisible={completing} 
      />

      <DragHandle
        isVisible={isOwner && (isSortable || isDraggable) && !todo.completed}
        listeners={isSortable ? sortable.listeners : draggable.listeners}
      />

      <TodoCheckbox 
        completed={todo.completed} 
        completing={completing} 
        onToggle={handleToggle} 
        isOwner={isOwner} 
      />

      <div className="flex-1 min-w-0">
        <TodoDisplay
            title={todo.title}
            completed={todo.completed}
            nudge={todo.description}
            parentTitle={parentTitle}
        />
        
        <SubtaskProgressBar 
          todoId={todo.id} 
          initialCount={todo.subtasks_count} 
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <TodoMetadata todo={todo} quests={quests} />
      </div>
    </motion.div>
  )
}
