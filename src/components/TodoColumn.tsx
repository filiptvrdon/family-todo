'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Todo } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Check, Calendar, RotateCcw, X } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { Drawer } from '@base-ui/react'

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
}

export default function TodoColumn({ todos, ownerName, isOwner, userId, onRefresh }: Props) {
  const [localTodos, setLocalTodos] = useState<Todo[]>(todos)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
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
      due_date: dueDate || null,
      recurrence: null,
      scheduled_time: null,
      completed: false,
      created_at: new Date().toISOString(),
    }

    setLocalTodos(prev => [optimistic, ...prev])
    setTitle('')
    setDueDate('')
    setAdding(false)

    await supabase.from('todos').insert({
      user_id: userId,
      title: optimistic.title,
      due_date: optimistic.due_date,
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
        // After celebration plays, reset the recurring task
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

  async function saveTodo(id: string, updates: Partial<Pick<Todo, 'title' | 'description' | 'due_date' | 'recurrence'>>) {
    setLocalTodos(prev =>
      prev.map(t => t.id === id ? { ...t, ...updates } : t)
    )
    await supabase.from('todos').update(updates).eq('id', id)
    onRefresh()
  }

  async function deleteTodo(id: string) {
    setLocalTodos(prev => prev.filter(t => t.id !== id))
    await supabase.from('todos').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>{ownerName}</h2>
        {isOwner && (
          <button
            onClick={() => setAdding(!adding)}
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: 'var(--color-primary)' }}
          >
            <Plus size={16} />
            Add
          </button>
        )}
      </div>

      {isOwner && adding && (
        <form
          onSubmit={addTodo}
          className="flex flex-col gap-2 rounded-xl p-3"
          style={{ background: '#fff', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
        >
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What needs doing?"
            className="text-sm rounded-lg px-3 py-1.5 w-full focus:outline-none"
            style={{ border: '1px solid var(--color-border)', minHeight: '44px' }}
          />
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="text-xs rounded-lg px-2 py-1.5 w-full focus:outline-none"
            style={{ border: '1px solid var(--color-border)', minHeight: '44px' }}
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs text-white px-3 py-1 rounded-lg transition"
              style={{ background: 'var(--color-primary)', minHeight: '32px' }}
            >
              Save
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {localTodos.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-disabled)' }}>
            No tasks yet
          </p>
        )}
        {localTodos.map(todo => (
          <TodoCard
            key={todo.id}
            todo={todo}
            isOwner={isOwner}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
            onOpen={openDetail}
          />
        ))}
      </div>

      {selectedTodo && (
        <TodoDetailPanel
          key={selectedTodo.id}
          todo={localTodos.find(t => t.id === selectedTodo.id) ?? selectedTodo}
          open={detailOpen}
          isOwner={isOwner}
          onClose={() => setDetailOpen(false)}
          onSave={(updates) => {
            void saveTodo(selectedTodo.id, updates)
            setDetailOpen(false)
          }}
          onDelete={() => {
            void deleteTodo(selectedTodo.id)
            setDetailOpen(false)
          }}
        />
      )}
    </div>
  )
}

function TodoCard({
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
      role="button"
      tabIndex={0}
      onClick={() => onOpen(todo)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onOpen(todo)}
      className={`rounded-xl px-3 py-2 flex items-center gap-2.5 cursor-pointer transition ${
        completing ? 'completing-card' : ''
      } ${todo.completed ? 'opacity-50' : ''}`}
      style={{
        background: '#fff',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {isOwner ? (
        <button
          onClick={handleToggle}
          className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition`}
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
        <span
          className="shrink-0"
          title={`Repeats ${todo.recurrence}`}
          style={{ color: 'var(--color-primary-light)' }}
        >
          <RotateCcw size={12} />
        </span>
      )}
      {todo.due_date && (
        <span className="shrink-0 flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-disabled)' }}>
          <Calendar size={11} />
          {format(new Date(todo.due_date + 'T00:00:00'), 'MMM d')}
        </span>
      )}
      {isOwner && (
        <button
          onClick={handleDelete}
          className="shrink-0 transition"
          style={{ color: 'var(--color-text-disabled)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-alert)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-disabled)')}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

type DetailUpdates = Partial<Pick<Todo, 'title' | 'description' | 'due_date' | 'recurrence'>>

function TodoDetailPanel({
  todo,
  open,
  isOwner,
  onClose,
  onSave,
  onDelete,
}: {
  todo: Todo
  open: boolean
  isOwner: boolean
  onClose: () => void
  onSave: (updates: DetailUpdates) => void
  onDelete: () => void
}) {
  const [editTitle, setEditTitle] = useState(todo.title)
  const [editDescription, setEditDescription] = useState(todo.description ?? '')
  const [editDueDate, setEditDueDate] = useState(todo.due_date ?? '')
  const [editRecurrence, setEditRecurrence] = useState<Recurrence | ''>(todo.recurrence ?? '')

  function handleSave() {
    if (!editTitle.trim()) return
    onSave({
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      due_date: editDueDate || null,
      recurrence: (editRecurrence as Recurrence) || null,
    })
  }

  return (
    <Drawer.Root open={open} onOpenChange={val => !val && onClose()}>
      <Drawer.Portal>
        <Drawer.Backdrop
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(26,26,46,0.45)',
            backdropFilter: 'blur(2px)',
            zIndex: 40,
            opacity: 'var(--opacity, 1)',
            transition: 'opacity 250ms ease',
          }}
          data-open={open || undefined}
        />
        <Drawer.Popup className="detail-panel-popup">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-9 h-1 rounded-full" style={{ background: 'var(--color-text-disabled)' }} />
          </div>

          <div className="px-5 pb-8 pt-2 flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Drawer.Title
                className="text-base font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                {isOwner ? 'Edit task' : 'Task detail'}
              </Drawer.Title>
              <Drawer.Close
                className="flex items-center justify-center rounded-full w-8 h-8 transition"
                style={{ color: 'var(--color-text-secondary)', background: 'var(--color-foam)' }}
              >
                <X size={16} />
              </Drawer.Close>
            </div>

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                Title
              </label>
              {isOwner ? (
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="text-sm rounded-xl px-4 py-3 w-full focus:outline-none"
                  style={{
                    background: '#fff',
                    border: '1.5px solid var(--color-border)',
                    color: 'var(--color-text)',
                    minHeight: '44px',
                  }}
                />
              ) : (
                <p className="text-sm" style={{ color: 'var(--color-text)' }}>{todo.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                Notes
              </label>
              {isOwner ? (
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="Add any notes…"
                  rows={3}
                  className="text-sm rounded-xl px-4 py-3 w-full focus:outline-none resize-none"
                  style={{
                    background: '#fff',
                    border: '1.5px solid var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                />
              ) : (
                <p className="text-sm" style={{ color: todo.description ? 'var(--color-text)' : 'var(--color-text-disabled)' }}>
                  {todo.description || 'No notes'}
                </p>
              )}
            </div>

            {/* Due date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                Due date
              </label>
              {isOwner ? (
                <input
                  type="date"
                  value={editDueDate}
                  onChange={e => setEditDueDate(e.target.value)}
                  className="text-sm rounded-xl px-4 py-3 w-full focus:outline-none"
                  style={{
                    background: '#fff',
                    border: '1.5px solid var(--color-border)',
                    color: editDueDate ? 'var(--color-text)' : 'var(--color-text-disabled)',
                    minHeight: '44px',
                  }}
                />
              ) : (
                <p className="text-sm" style={{ color: todo.due_date ? 'var(--color-text)' : 'var(--color-text-disabled)' }}>
                  {todo.due_date ? format(new Date(todo.due_date + 'T00:00:00'), 'MMMM d, yyyy') : 'No due date'}
                </p>
              )}
            </div>

            {/* Recurrence */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                Repeat
              </label>
              {isOwner ? (
                <div className="flex gap-2 flex-wrap">
                  {(['', 'daily', 'weekly', 'monthly'] as const).map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setEditRecurrence(val)}
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition"
                      style={{
                        minHeight: '36px',
                        background: editRecurrence === val ? 'var(--color-primary)' : 'var(--color-foam)',
                        color: editRecurrence === val ? '#fff' : 'var(--color-text-secondary)',
                        border: editRecurrence === val ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border)',
                      }}
                    >
                      {val === '' ? 'None' : val.charAt(0).toUpperCase() + val.slice(1)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: todo.recurrence ? 'var(--color-text)' : 'var(--color-text-disabled)' }}>
                  {todo.recurrence
                    ? todo.recurrence.charAt(0).toUpperCase() + todo.recurrence.slice(1)
                    : 'Does not repeat'}
                </p>
              )}
            </div>

            {/* Actions */}
            {isOwner && (
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!editTitle.trim()}
                  className="w-full font-semibold text-sm rounded-xl transition"
                  style={{
                    background: 'var(--color-primary)',
                    color: '#fff',
                    minHeight: '48px',
                    opacity: editTitle.trim() ? 1 : 0.4,
                  }}
                >
                  Save changes
                </button>
                <button
                  onClick={() => { onDelete(); onClose() }}
                  className="w-full text-sm rounded-xl transition"
                  style={{
                    background: 'transparent',
                    color: 'var(--color-alert)',
                    minHeight: '44px',
                    border: '1.5px solid var(--color-alert)',
                  }}
                >
                  Delete task
                </button>
              </div>
            )}
          </div>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
