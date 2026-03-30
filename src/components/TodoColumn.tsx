'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Todo } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Check, Calendar } from 'lucide-react'
import { format } from 'date-fns'

const CELEBRATIONS = [
  'Badass 🍑',
  'You rock 🤘',
  'Nailed it 🔨',
  "That's my girl 💙 ",
  'Knocked it out 🥊',
]

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
  const supabase = createClient()

  // Sync from server whenever a background refresh completes
  useEffect(() => {
    setLocalTodos(todos)
  }, [todos])

  async function addTodo(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const tempId = `temp-${Date.now()}`
    const optimistic: Todo = {
      id: tempId,
      user_id: userId,
      title: title.trim(),
      description: null,
      due_date: dueDate || null,
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
    onRefresh() // background sync — replaces temp item with real one
  }

  async function toggleTodo(todo: Todo) {
    const completed = !todo.completed

    // Optimistic update
    setLocalTodos(prev =>
      prev.map(t => t.id === todo.id ? { ...t, completed } : t)
    )

    if (completed) {
      toast(CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)], {
        duration: 2000,
        style: {
          color: 'var(--color-completion)',
          fontWeight: '500',
        },
      })
    }

    await supabase.from('todos').update({ completed }).eq('id', todo.id)
    onRefresh() // background sync
  }

  async function deleteTodo(id: string) {
    setLocalTodos(prev => prev.filter(t => t.id !== id))
    await supabase.from('todos').delete().eq('id', id)
    onRefresh() // background sync
  }

  const pending = localTodos.filter((t) => !t.completed)
  const done = localTodos.filter((t) => t.completed)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-700 text-lg">{ownerName}</h2>
        {isOwner && (
          <button
            onClick={() => setAdding(!adding)}
            className="flex items-center gap-1 text-sm text-rose-500 hover:text-rose-600 font-medium"
          >
            <Plus size={16} />
            Add
          </button>
        )}
      </div>

      {isOwner && adding && (
        <form onSubmit={addTodo} className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing?"
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-300 w-full"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-300 w-full"
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setAdding(false)} className="text-xs text-gray-500 hover:text-gray-700">
              Cancel
            </button>
            <button type="submit" className="text-xs bg-rose-500 hover:bg-rose-600 text-white px-3 py-1 rounded-lg transition">
              Save
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {pending.length === 0 && done.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No tasks yet</p>
        )}
        {pending.map((todo) => (
          <TodoCard
            key={todo.id}
            todo={todo}
            isOwner={isOwner}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
          />
        ))}
        {done.length > 0 && (
          <p className="text-xs text-gray-400 uppercase tracking-wide mt-2 mb-1">Done ({done.length})</p>
        )}
        {done.map((todo) => (
          <TodoCard
            key={todo.id}
            todo={todo}
            isOwner={isOwner}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
          />
        ))}
      </div>
    </div>
  )
}

function TodoCard({
  todo,
  isOwner,
  onToggle,
  onDelete,
}: {
  todo: Todo
  isOwner: boolean
  onToggle: (t: Todo) => void
  onDelete: (id: string) => void
}) {
  const [completing, setCompleting] = useState(false)

  function handleToggle() {
    if (!todo.completed && !completing) {
      setCompleting(true)
      setTimeout(() => onToggle(todo), 300)
    } else if (todo.completed) {
      onToggle(todo)
    }
  }

  return (
    <div
      className={`bg-white border rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-sm transition ${
        completing ? 'completing-card' : ''
      } ${todo.completed ? 'opacity-50' : ''}`}
    >
      {isOwner ? (
        <button
          onClick={handleToggle}
          className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
            todo.completed || completing ? 'border-transparent' : 'border-gray-300 hover:border-rose-400'
          }`}
          style={
            todo.completed || completing
              ? { backgroundColor: 'var(--color-completion)', borderColor: 'var(--color-completion)' }
              : undefined
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
          className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            todo.completed ? 'bg-indigo-400 border-indigo-400' : 'border-gray-200'
          }`}
        >
          {todo.completed && <Check size={11} className="text-white" strokeWidth={3} />}
        </div>
      )}
      <p className={`flex-1 text-sm font-medium text-gray-800 truncate ${todo.completed ? 'line-through' : ''}`}>
        {todo.title}
      </p>
      {todo.due_date && (
        <span className="shrink-0 flex items-center gap-1 text-xs text-gray-400">
          <Calendar size={11} />
          {format(new Date(todo.due_date + 'T00:00:00'), 'MMM d')}
        </span>
      )}
      {isOwner && (
        <button onClick={() => onDelete(todo.id)} className="shrink-0 text-gray-300 hover:text-red-400 transition">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}
