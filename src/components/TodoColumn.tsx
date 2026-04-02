'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Todo } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Check, Calendar, GripVertical } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { useDraggable } from '@dnd-kit/core'
import TodoDetailPanel from '@/components/TodoDetailPanel'

const CELEBRATIONS = [
  'Badass 🍑',
  'You rock 🤘',
  'Nailed it 🔨',
  "That's my girl 💙 ",
  'Knocked it out 🥊',
]

type Recurrence = 'daily' | 'weekly' | 'monthly'

function nextDueDate(recurrence: Recurrence): string {
  const today = new Date()
  if (recurrence === 'daily') return format(addDays(today, 1), 'yyyy-MM-dd')
  if (recurrence === 'weekly') return format(addDays(today, 7), 'yyyy-MM-dd')
  return format(addDays(today, 30), 'yyyy-MM-dd')
}

interface Props {
  todos: Todo[]
  ownerName: string
  isOwner: boolean
  userId: string
  onRefresh: () => void
  draggable?: boolean
}

export default function TodoColumn({ todos, ownerName, isOwner, userId, onRefresh, draggable = false }: Props) {
  const [localTodos, setLocalTodos] = useState<Todo[]>(todos)
  const [title, setTitle] = useState('')
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setLocalTodos(todos)
  }, [todos])

  function openDetail(todo: Todo) {
    setSelectedTodo(todo)
    setDetailOpen(true)
  }

  async function addTodo(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!title.trim()) return

    const tempId = `temp-${Date.now()}`
    const optimistic: Todo = {
      id: tempId,
      user_id: userId,
      title: title.trim(),
      description: null,
      due_date: null,
      recurrence: null,
      scheduled_time: null,
      parent_id: null,
      index: '',
      completed: false,
      created_at: new Date().toISOString(),
    }

    setLocalTodos(prev => [optimistic, ...prev])
    setTitle('')

    await supabase.from('todos').insert({
      user_id: userId,
      title: optimistic.title,
    })
    onRefresh()
  }

  async function toggleTodo(todo: Todo) {
    const completing = !todo.completed

    setLocalTodos(prev =>
      prev.map(t => t.id === todo.id ? { ...t, completed: completing } : t)
    )

    if (completing) {
      toast(CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)], {
        duration: 2000,
        style: {
          color: 'var(--color-completion)',
          fontWeight: '500',
        },
      })

      await supabase.from('todos').update({ completed: true }).eq('id', todo.id)

      if (todo.recurrence) {
        setTimeout(async () => {
          const due = nextDueDate(todo.recurrence!)
          await supabase
            .from('todos')
            .update({ completed: false, due_date: due })
            .eq('id', todo.id)
          onRefresh()
        }, 1500)
      } else {
        onRefresh()
      }
    } else {
      await supabase.from('todos').update({ completed: false }).eq('id', todo.id)
      onRefresh()
    }
  }

  async function deleteTodo(id: string) {
    setLocalTodos(prev => prev.filter(t => t.id !== id))
    await supabase.from('todos').delete().eq('id', id)
    onRefresh()
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const displayTodos = localTodos.filter(todo => !todo.completed || todo.due_date === today)

  return (
    <div className="flex flex-col gap-3">
      {isOwner && (
        <form onSubmit={addTodo}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Add a task…"
            className="text-sm rounded-xl px-3 py-2.5 w-full focus:outline-none border border-border bg-background text-foreground min-h-[44px] placeholder:text-text-disabled"
          />
        </form>
      )}

      <div className="flex flex-col gap-2">
        {displayTodos.length === 0 && (
          <p className="text-sm text-center py-6 text-text-disabled">No tasks yet</p>
        )}
        {displayTodos.map(todo =>
          draggable ? (
            <DraggableTodoCard
              key={todo.id}
              todo={todo}
              isOwner={isOwner}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
              onOpen={openDetail}
            />
          ) : (
            <TodoCard
              key={todo.id}
              todo={todo}
              isOwner={isOwner}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
              onOpen={openDetail}
            />
          )
        )}
      </div>

      {selectedTodo && (
        <TodoDetailPanel
          key={selectedTodo.id}
          todo={localTodos.find(t => t.id === selectedTodo.id) ?? selectedTodo}
          open={detailOpen}
          isOwner={isOwner}
          onClose={() => setDetailOpen(false)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  )
}

interface TodoCardProps {
  todo: Todo
  isOwner: boolean
  onToggle: (t: Todo) => void
  onDelete: (id: string) => void
  onOpen: (t: Todo) => void
  dragHandle?: React.ReactNode
  isDragging?: boolean
  cardRef?: (node: HTMLElement | null) => void
}

function TodoCard({
  todo,
  isOwner,
  onToggle,
  onDelete,
  onOpen,
  dragHandle,
  isDragging = false,
  cardRef,
}: TodoCardProps) {
  const [completing, setCompleting] = useState(false)

  function handleToggle(e: { stopPropagation(): void }) {
    e.stopPropagation()
    if (!todo.completed && !completing) {
      setCompleting(true)
      setTimeout(() => onToggle(todo), 300)
    } else if (todo.completed) {
      onToggle(todo)
    }
  }

  function handleDelete(e: { stopPropagation(): void }) {
    e.stopPropagation()
    onDelete(todo.id)
  }

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(todo)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onOpen(todo)}
      className={`rounded-xl px-3 py-2 flex items-center gap-2.5 cursor-pointer transition bg-card border border-border shadow-[var(--shadow-card)] ${
        completing ? 'completing-card' : ''
      }`}
      style={{ opacity: isDragging ? 0.4 : todo.completed ? 0.5 : 1 }}
    >
      {dragHandle}
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
      <p
        className={`flex-1 text-sm font-medium truncate ${todo.completed ? 'line-through' : ''}`}
        style={{ color: todo.completed ? 'var(--color-text-secondary)' : 'var(--color-text)' }}
      >
        {todo.title}
      </p>
      {todo.recurrence && (
        <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-foam)', color: 'var(--color-accent)' }}>
          {todo.recurrence.charAt(0).toUpperCase() + todo.recurrence.slice(1)}
        </span>
      )}
      {todo.due_date && (
        <span className="shrink-0 flex items-center gap-1 text-xs text-text-disabled">
          <Calendar size={11} />
          {format(new Date(todo.due_date + 'T00:00:00'), 'MMM d')}
        </span>
      )}
      {isOwner && (
        <button
          onClick={handleDelete}
          className="shrink-0 transition text-text-disabled hover:text-destructive"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

function DraggableTodoCard({
  todo,
  isOwner,
  onToggle,
  onDelete,
  onOpen,
}: {
  todo: Todo
  isOwner: boolean
  onToggle: (t: Todo) => void
  onDelete: (id: string) => void
  onOpen: (t: Todo) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: todo.id,
    data: { source: 'todo-column', todo },
    disabled: todo.completed,
  })

  const dragHandle = !todo.completed ? (
    <button
      {...listeners}
      {...attributes}
      onClick={e => e.stopPropagation()}
      className="shrink-0 text-text-disabled cursor-grab active:cursor-grabbing touch-none"
    >
      <GripVertical size={14} />
    </button>
  ) : undefined

  return (
    <TodoCard
      todo={todo}
      isOwner={isOwner}
      onToggle={onToggle}
      onDelete={onDelete}
      onOpen={onOpen}
      dragHandle={dragHandle}
      isDragging={isDragging}
      cardRef={setNodeRef}
    />
  )
}
