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
      setTimeout(() => onToggle(todo), 300)
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

  const style: React.CSSProperties = {
    opacity: (sortable.isDragging || draggable.isDragging) ? 0.4 : todo.completed ? 0.5 : 1,
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  }

  // Combine refs
  const setNodeRef = (node: HTMLElement | null) => {
    sortable.setNodeRef(node)
    if (isDraggable) draggable.setNodeRef(node)
    if (isDroppable) droppable.setNodeRef(node)
  }

  const isOver = droppable.isOver

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      onClick={() => !editing && onOpen(todo)}
      onKeyDown={e => !editing && (e.key === 'Enter' || e.key === ' ') && onOpen(todo)}
      className={`w-full min-w-0 rounded-xl px-3 py-2 flex items-center gap-2.5 cursor-pointer transition bg-card border shadow-[var(--shadow-card)] group ${
        completing ? 'completing-card' : ''
      } ${isOver ? 'ring-2 ring-primary border-primary bg-primary/5' : 'border-border'}`}
    >
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
          className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition"
          style={
            todo.completed || completing
              ? { backgroundColor: 'var(--color-completion)', borderColor: 'var(--color-completion)' }
              : { borderColor: 'var(--color-text-disabled)' }
          }
        >
          {(todo.completed || completing) && (
            <Check
              size={11}
              className={`text-white ${completing && !todo.completed ? 'completing-check' : ''}`}
              strokeWidth={3}
            />
          )}
        </button>
      ) : (
        <div
          className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center"
          style={
            todo.completed
              ? { backgroundColor: 'var(--color-primary-light)', borderColor: 'var(--color-primary-light)' }
              : { borderColor: 'var(--color-border)' }
          }
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
            {todo.subtasks_count !== undefined && todo.subtasks_count > 0 && subtaskTotals && (
              <div className="mt-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span className="font-semibold">{completedSub}/{totalSub}</span>
                  {encouragement && <span className="italic">{encouragement}</span>}
                </div>
                <div className="h-1 w-full bg-foam rounded-full overflow-hidden mt-0.5">
                  <div
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${subProgress}%` }}
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
              {quests.slice(0, 3).map(q => (
                <span
                  key={q.name}
                  title={q.name}
                  style={{
                    color: q.status === 'completed' ? 'var(--color-text-disabled)' : 'var(--color-primary)',
                    opacity: q.status === 'completed' ? 0.5 : 1,
                  }}
                >
                  <QuestIcon name={q.icon} size={13} />
                </span>
              ))}
            </div>
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
    </div>
  )
}
