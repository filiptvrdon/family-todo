'use client'

import { useState, useEffect, useMemo } from 'react'
import { Todo } from '@/lib/types'
import { Trash2, Check, Calendar, GripVertical, Pencil } from 'lucide-react'
import { QuestIcon } from '@/lib/questIcons'
import { format } from 'date-fns'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

interface QuestLink {
  icon: string
  name: string
  status: string
}

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

const START_MESSAGES = [
  'Let\'s get this rolling! 🚀',
  'A fresh start awaits ✨',
  'Tiny steps, big wins 💪',
  'You\'ve got this! 🌟',
  'Ready when you are 🙌',
]

const IN_PROGRESS_MESSAGES = [
  'Making moves ⚡️',
  'Chipping away 🧱',
  'Momentum looks great 🚴‍♀️',
  'Keep the flow going 💧',
  'You\'re on a roll 🌀',
]

const DONE_MESSAGES = [
  'All done — legend! 🏆',
  'Perfection unlocked ✅',
  'Mission accomplished 🎯',
  'That was chef\'s kiss 👩‍🍳✨',
  'Confetti time 🎉',
]

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
  const [editValue, setEditValue] = useState(todo.title)

  const supabase = createClient()
  const [subtaskTotals, setSubtaskTotals] = useState<{ total: number; completed: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchCounts() {
      if (!todo.subtasks_count || todo.subtasks_count <= 0) return
      const { data } = await supabase
        .from('todos')
        .select('id, completed')
        .eq('parent_id', todo.id)
      if (!cancelled && data) {
        const total = data.length
        const completed = data.filter(d => d.completed).length
        setSubtaskTotals({ total, completed })
      }
    }
    fetchCounts()
    return () => { cancelled = true }
  }, [supabase, todo.id, todo.subtasks_count])

  const totalSub = useMemo(() => subtaskTotals?.total ?? (todo.subtasks_count ?? 0), [subtaskTotals?.total, todo.subtasks_count])
  const completedSub = useMemo(() => subtaskTotals?.completed ?? 0, [subtaskTotals?.completed])
  const subProgress = useMemo(() => (totalSub > 0 ? (completedSub / totalSub) * 100 : 0), [completedSub, totalSub])

  const encouragement = useMemo(() => {
    if (!subtaskTotals) return null
    if (totalSub === 0) return null
    const index = todo.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    if (completedSub === 0) return START_MESSAGES[index % START_MESSAGES.length]
    if (completedSub < totalSub) return IN_PROGRESS_MESSAGES[index % IN_PROGRESS_MESSAGES.length]
    return DONE_MESSAGES[index % DONE_MESSAGES.length]
  }, [subtaskTotals, completedSub, totalSub, todo.id])

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
      setTimeout(() => onToggle(todo), 850)
    } else if (todo.completed) {
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

  const isDragging = sortable.isDragging || draggable.isDragging
  const style: React.CSSProperties = {
    // Only set opacity via style when dragging — otherwise let Framer Motion own it
    // to avoid conflicting with completing/exit animations
    opacity: isDragging ? 0.4 : undefined,
    transform: CSS.Transform.toString(sortable.transform),
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
      transition={{ duration: 0.18, delay: 0.12 }}
      className={`w-full min-w-0 rounded-xl px-3 py-2 flex items-center gap-2.5 cursor-pointer transition-colors bg-card border shadow-[var(--shadow-card)] group relative ${
        isOver ? 'ring-2 ring-primary border-primary bg-primary/5' : 'border-border'
      }`}
    >
      <AnimatePresence>
        {completing && (
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 1, 0], y: -20 }}
            transition={{ duration: 1.2, times: [0, 0.2, 0.8, 1], delay: 0.3 }}
            className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none whitespace-nowrap"
          >
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[11px] font-bold text-completion">
                +{todo.momentum_contribution || 0} Momentum
              </span>
              {quests && quests.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-primary-dark font-medium">
                  <QuestIcon name={quests[0].icon} size={10} />
                  {quests[0].name}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isOwner && (isSortable || isDraggable) && !todo.completed && (
        <div
          {...(isSortable ? { ...sortable.listeners } : { ...draggable.listeners })}
          onClick={e => e.stopPropagation()}
          className="shrink-0 text-text-disabled cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical size={14} />
        </div>
      )}

      {isOwner ? (
        <button
          onClick={handleToggle}
          className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition relative overflow-hidden"
          style={
            todo.completed || completing
              ? { borderColor: 'var(--color-completion)' }
              : { borderColor: 'var(--color-text-disabled)' }
          }
        >
          <motion.div
            className="absolute inset-0 bg-completion"
            initial={false}
            animate={(todo.completed || completing) ? { scale: 1 } : { scale: 0 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
          />
          <AnimatePresence>
            {(todo.completed || completing) && (
              <motion.div
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.12, delay: 0.08 }}
                className="z-10"
              >
                <Check size={11} className="text-white" strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      ) : (
        <div
          className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-completion"
          style={{ borderColor: 'var(--color-completion)' }}
        >
          {todo.completed && <Check size={11} className="text-white" strokeWidth={3} />}
        </div>
      )}

      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onClick={e => e.stopPropagation()}
            onBlur={() => {
              if (editValue.trim() && editValue.trim() !== todo.title) {
                onEdit?.(todo.id, editValue.trim())
              } else {
                setEditValue(todo.title)
              }
              setEditing(false)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') {
                setEditValue(todo.title)
                setEditing(false)
              }
            }}
            className="w-full text-sm font-medium rounded-lg px-2 py-0.5 focus:outline-none bg-card border-[1.5px] border-border text-foreground"
          />
        ) : (
          <>
            <p
              className={`text-sm font-medium truncate ${todo.completed ? 'line-through' : ''}`}
              style={{ color: todo.completed ? 'var(--color-text-secondary)' : 'var(--color-text)' }}
            >
              {todo.title}
            </p>
            {!todo.completed && (todo.motivation_nudge || streamingNudge) && (
              <p className="text-[11px] italic mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                {todo.motivation_nudge || streamingNudge}
              </p>
            )}
            {todo.subtasks_count !== undefined && todo.subtasks_count > 0 && subtaskTotals && (
              <div className="mt-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span className="font-semibold">{completedSub}/{totalSub}</span>
                  {encouragement && <span className="italic">{encouragement}</span>}
                </div>
                <div className="h-1 w-full bg-foam rounded-full overflow-hidden mt-0.5 relative">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${subProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                  <motion.div
                    className="absolute top-0 bottom-0 bg-white/30 w-2 blur-[1px]"
                    animate={{ left: `${subProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {!editing && (
        <div className="flex items-center gap-2 shrink-0">
          {quests && quests.length > 0 && (
            <div className="flex items-center gap-1">
              {quests.slice(0, 3).map((q, i) => (
                <motion.span
                  key={q.name}
                  title={q.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: q.status === 'completed' ? 0.5 : 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.05, ease: 'easeOut' }}
                  style={{
                    color: q.status === 'completed' ? 'var(--color-text-disabled)' : 'var(--color-primary)',
                    display: 'inline-flex',
                  }}
                >
                  <QuestIcon name={q.icon} size={13} />
                </motion.span>
              ))}
            </div>
          )}
          {todo.energy_level && todo.energy_level !== 'low' && (
            <span 
              className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: 'var(--color-foam)', color: 'var(--color-text-secondary)' }}
            >
              {todo.energy_level}
            </span>
          )}
          {todo.recurrence && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-foam)', color: 'var(--color-accent)' }}>
              {todo.recurrence.charAt(0).toUpperCase() + todo.recurrence.slice(1)}
            </span>
          )}
          {todo.due_date && (
            <span className="flex items-center gap-1 text-xs text-text-disabled">
              <Calendar size={11} />
              {format(new Date(todo.due_date + 'T00:00:00'), 'MMM d')}
            </span>
          )}
          {isOwner && (
            <div className="hidden md:flex items-center gap-1">
              <button
                type="button"
                onClick={handleEdit}
                className="opacity-0 group-hover:opacity-100 transition p-1 rounded-lg text-text-disabled hover:text-foreground"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={handleDelete}
                className="opacity-0 group-hover:opacity-100 transition text-text-disabled hover:text-destructive p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
