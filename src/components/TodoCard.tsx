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
import { TodoTitleInput } from './todo-card/TodoTitleInput'
import { TodoDisplay } from './todo-card/TodoDisplay'
import { SubtaskProgressBar } from './todo-card/SubtaskProgressBar'
import { TodoMetadata } from './todo-card/TodoMetadata'
import { TodoActions } from './todo-card/TodoActions'

interface Props {
  todo: Todo
  isOwner: boolean
  onToggle: (t: Todo) => void
  onDelete: (id: string) => void
  onOpen: (t: Todo) => void
  onEdit?: (id: string, newTitle: string) => void
  isSortable?: boolean
  isDraggable?: boolean
  isDroppable?: boolean
  quests?: QuestLink[]
  streamingNudge?: string
}

export default function TodoCard({
  todo,
  isOwner,
  onToggle,
  onDelete,
  onOpen,
  onEdit,
  isSortable = false,
  isDraggable = false,
  isDroppable = false,
  quests,
  streamingNudge,
}: Props) {
  const [completing, setCompleting] = useState(false)
  const [editing, setEditing] = useState(false)

  // Sortable hook
  const sortable = useSortable({
    id: todo.id,
    disabled: !isSortable || !isOwner || editing,
    data: isDraggable ? { source: 'todo-column', todo } : undefined,
  })

  // Draggable hook (for calendar drops - fallback for non-sortable lists)
  const draggable = useDraggable({
    id: todo.id,
    data: { source: 'todo-column', todo },
    disabled: !isDraggable || isSortable || todo.completed || editing,
  })

  // Droppable hook (for creating sub-tasks)
  const droppable = useDroppable({
    id: `todo-${todo.id}`,
    data: { type: 'todo-drop-target', todoId: todo.id },
    disabled: !isDroppable || editing,
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

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    onDelete(todo.id)
  }

  function handleEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setEditing(true)
  }

  function handleSave(newTitle: string) {
    onEdit?.(todo.id, newTitle)
    setEditing(false)
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
      onClick={() => !editing && onOpen(todo)}
      onKeyDown={e => !editing && (e.key === 'Enter' || e.key === ' ') && onOpen(todo)}
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
        momentum={todo.momentum_contribution || 0} 
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
        {editing ? (
          <TodoTitleInput 
            value={todo.title} 
            onSave={handleSave} 
            onCancel={() => setEditing(false)} 
          />
        ) : (
          <TodoDisplay 
            title={todo.title} 
            completed={todo.completed} 
            // nudge={todo.motivation_nudge || streamingNudge}
              nudge={todo.description}
          />
        )}
        
        <SubtaskProgressBar 
          todoId={todo.id} 
          initialCount={todo.subtasks_count} 
        />
      </div>

      {!editing && (
        <div className="flex items-center gap-2 shrink-0">
          <TodoMetadata todo={todo} quests={quests} />
          <TodoActions 
            isOwner={isOwner} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
          />
        </div>
      )}
    </motion.div>
  )
}
