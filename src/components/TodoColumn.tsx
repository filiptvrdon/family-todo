'use client'

import { useState } from 'react'
import { Todo, Priority } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Check, Calendar } from 'lucide-react'
import { format } from 'date-fns'

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
}

const CELEBRATIONS = [
  'Nice one!',
  'One less thing ✓',
  'Done! 🎉',
  'You got it!',
  'Knocked it out ✓',
]

interface Props {
  todos: Todo[]
  ownerName: string
  isOwner: boolean
  userId: string
  onRefresh: () => void
}

export default function TodoColumn({ todos, ownerName, isOwner, userId, onRefresh }: Props) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [celebration, setCelebration] = useState<{ msg: string; key: number } | null>(null)
  const supabase = createClient()

  async function addTodo(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await supabase.from('todos').insert({
      user_id: userId,
      title: title.trim(),
      priority,
      due_date: dueDate || null,
    })
    setTitle('')
    setPriority('medium')
    setDueDate('')
    setAdding(false)
    onRefresh()
  }

  async function toggleTodo(todo: Todo) {
    await supabase.from('todos').update({ completed: !todo.completed }).eq('id', todo.id)
    onRefresh()
  }

  async function deleteTodo(id: string) {
    await supabase.from('todos').delete().eq('id', id)
    onRefresh()
  }

  function handleComplete() {
    const msg = CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)]
    setCelebration({ msg, key: Date.now() })
    setTimeout(() => setCelebration(null), 2100)
  }

  const pending = todos.filter((t) => !t.completed)
  const done = todos.filter((t) => t.completed)

  return (
    <div className="flex flex-col gap-3 relative">
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

      {celebration && (
        <p
          key={celebration.key}
          className="celebration-message text-sm font-medium text-center absolute left-0 right-0"
          style={{ color: 'var(--color-completion)', top: '2rem', zIndex: 10 }}
        >
          {celebration.msg}
        </p>
      )}

      {isOwner && adding && (
        <form onSubmit={addTodo} className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing?"
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-300 w-full"
          />
          <div className="flex gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-300"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-300 flex-1"
            />
          </div>
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
            onComplete={handleComplete}
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
  onComplete,
}: {
  todo: Todo
  isOwner: boolean
  onToggle: (t: Todo) => void
  onDelete: (id: string) => void
  onComplete?: () => void
}) {
  const [completing, setCompleting] = useState(false)

  function handleToggle() {
    if (!todo.completed && !completing) {
      setCompleting(true)
      onComplete?.()
      setTimeout(() => onToggle(todo), 300)
    } else if (todo.completed) {
      onToggle(todo)
    }
  }

  return (
    <div
      className={`bg-white border rounded-xl px-3 py-2.5 flex items-start gap-2.5 shadow-sm transition ${
        completing ? 'completing-card' : ''
      } ${todo.completed ? 'opacity-50' : ''}`}
    >
      {isOwner ? (
        <button
          onClick={handleToggle}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
            todo.completed || completing
              ? 'border-transparent'
              : 'border-gray-300 hover:border-rose-400'
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
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            todo.completed ? 'bg-indigo-400 border-indigo-400' : 'border-gray-200'
          }`}
        >
          {todo.completed && <Check size={11} className="text-white" strokeWidth={3} />}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium text-gray-800 truncate ${todo.completed ? 'line-through' : ''}`}>
          {todo.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[todo.priority]}`}>
            {todo.priority}
          </span>
          {todo.due_date && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar size={11} />
              {format(new Date(todo.due_date + 'T00:00:00'), 'MMM d')}
            </span>
          )}
        </div>
      </div>
      {isOwner && (
        <button onClick={() => onDelete(todo.id)} className="text-gray-300 hover:text-red-400 transition flex-shrink-0 mt-0.5">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}
