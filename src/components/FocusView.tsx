'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Todo } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { format, addDays, parseISO } from 'date-fns'
import { Calendar, RotateCcw } from 'lucide-react'

const CELEBRATIONS = [
  'Badass 🍑',
  'You rock 🤘',
  'Nailed it 🔨',
  "That's my girl 💙 ",
  'Knocked it out 🥊',
]

const SKIP_KEY = 'focus_skipped'

function getSkippedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SKIP_KEY)
    if (!raw) return new Set()
    const { date, ids } = JSON.parse(raw)
    const today = format(new Date(), 'yyyy-MM-dd')
    if (date !== today) {
      sessionStorage.removeItem(SKIP_KEY)
      return new Set()
    }
    return new Set(ids as string[])
  } catch {
    return new Set()
  }
}

function saveSkippedIds(ids: Set<string>) {
  const today = format(new Date(), 'yyyy-MM-dd')
  sessionStorage.setItem(SKIP_KEY, JSON.stringify({ date: today, ids: Array.from(ids) }))
}

function selectTask(todos: Todo[], skipped: Set<string>): Todo | null {
  const today = format(new Date(), 'yyyy-MM-dd')
  const candidates = todos.filter(t => !t.completed && !skipped.has(t.id))

  candidates.sort((a, b) => {
    const aOverdue = !!(a.due_date && a.due_date < today)
    const bOverdue = !!(b.due_date && b.due_date < today)

    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1

    if (a.due_date && b.due_date) {
      if (a.due_date < b.due_date) return -1
      if (a.due_date > b.due_date) return 1
    } else if (a.due_date && !b.due_date) {
      return -1
    } else if (!a.due_date && b.due_date) {
      return 1
    }

    return a.created_at < b.created_at ? -1 : 1
  })

  return candidates[0] ?? null
}

interface Props {
  myTodos: Todo[]
  partnerTodos: Todo[]
  myName: string
  partnerName: string
  myUserId: string
  onRefresh: () => void
}

export default function FocusView({ myTodos, partnerTodos, myName, partnerName, myUserId, onRefresh }: Props) {
  const [localTodos, setLocalTodos] = useState<Todo[]>(() => [...myTodos, ...partnerTodos])
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [completing, setCompleting] = useState(false)
  const supabase = createClient()

  // Sync incoming props into local state (e.g. after a background refresh)
  useEffect(() => {
    setLocalTodos([...myTodos, ...partnerTodos])
  }, [myTodos, partnerTodos])

  useEffect(() => {
    setSkipped(getSkippedIds())
  }, [])

  const task = useMemo(() => selectTask(localTodos, skipped), [localTodos, skipped])

  const isOwn = task ? task.user_id === myUserId : false
  const today = format(new Date(), 'yyyy-MM-dd')
  const isOverdue = !!(task?.due_date && task.due_date < today)

  async function handleDone() {
    if (!task || completing) return
    setCompleting(true)

    toast(CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)], {
      duration: 2000,
      style: { color: 'var(--color-completion)', fontWeight: '500' },
    })

    // Optimistically mark completed so next task surfaces immediately
    setLocalTodos(prev => prev.map(t => t.id === task.id ? { ...t, completed: true } : t))

    supabase.from('todos').update({ completed: true }).eq('id', task.id).then(() => {
      if (task.recurrence) {
        const days = task.recurrence === 'daily' ? 1 : task.recurrence === 'weekly' ? 7 : 30
        const due = format(addDays(new Date(), days), 'yyyy-MM-dd')
        setTimeout(async () => {
          await supabase.from('todos').update({ completed: false, due_date: due }).eq('id', task.id)
          setLocalTodos(prev =>
            prev.map(t => t.id === task.id ? { ...t, completed: false, due_date: due } : t)
          )
          setCompleting(false)
          onRefresh()
        }, 1500)
      } else {
        setCompleting(false)
        onRefresh()
      }
    })
  }

  function handleSkip() {
    if (!task) return
    const next = new Set(skipped)
    next.add(task.id)
    saveSkippedIds(next)
    setSkipped(next)
  }

  async function handleLater() {
    if (!task) return
    const newDate = task.due_date
      ? format(addDays(parseISO(task.due_date), 1), 'yyyy-MM-dd')
      : format(addDays(new Date(), 1), 'yyyy-MM-dd')

    // Update locally so next task surfaces immediately
    setLocalTodos(prev =>
      prev.map(t => t.id === task.id ? { ...t, due_date: newDate } : t)
    )

    const next = new Set(skipped)
    next.add(task.id)
    saveSkippedIds(next)
    setSkipped(next)

    supabase.from('todos').update({ due_date: newDate }).eq('id', task.id).then(() => onRefresh())
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-8 min-h-[60vh]">
        <div className="text-5xl mb-4">🎉</div>
        <p className="text-xl font-semibold mb-2 text-foreground">You're all clear</p>
        <p className="text-base text-muted-foreground">Nothing left to do right now.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 min-h-[60vh]">
      <div className="w-full max-w-[360px] rounded-2xl p-8 flex flex-col gap-6 bg-card border border-border shadow-[0_4px_24px_rgba(0,181,200,0.12)]">
        {/* Owner badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-foam text-muted-foreground">
            {isOwn ? 'Your task' : `${partnerName}'s task`}
          </span>
          {task.recurrence && (
            <span className="text-accent" title={`Repeats ${task.recurrence}`}>
              <RotateCcw size={14} />
            </span>
          )}
        </div>

        {/* Title */}
        <p className="text-2xl font-semibold leading-snug text-foreground">{task.title}</p>

        {/* Due date — color is dynamic (overdue state), keep inline */}
        {task.due_date && (
          <div
            className="flex items-center gap-1.5 text-sm"
            style={{ color: isOverdue ? 'var(--color-alert)' : 'var(--color-text-secondary)' }}
          >
            <Calendar size={14} />
            <span>
              {isOverdue ? 'Overdue · ' : ''}
              {format(new Date(task.due_date + 'T00:00:00'), 'MMMM d')}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={handleDone}
            disabled={completing}
            className="w-full font-semibold text-sm rounded-xl transition bg-primary text-primary-foreground min-h-[52px]"
            style={{ opacity: completing ? 0.6 : 1 }}
          >
            Done
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 text-sm rounded-xl transition text-muted-foreground min-h-[44px]"
            >
              Skip
            </button>
            <button
              onClick={handleLater}
              className="flex-1 text-sm rounded-xl transition text-muted-foreground min-h-[44px]"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
