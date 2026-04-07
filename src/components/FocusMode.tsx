'use client'

import { useMemo, useState } from 'react'
import { Todo } from '@/lib/types'
import { useTodoStore } from '@/stores/todo-store'
import { format, addDays, parseISO } from 'date-fns'
import { Calendar, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  partnerName: string
  myUserId: string
  onRefresh: () => void
}

export default function FocusMode({ partnerName, myUserId }: Props) {
  const storeMyTodos = useTodoStore(s => s.myTodos)
  const storePartnerTodos = useTodoStore(s => s.partnerTodos)
  const localTodos = useMemo(() => [...storeMyTodos, ...storePartnerTodos], [storeMyTodos, storePartnerTodos])
  
  const [skipped, setSkipped] = useState<Set<string>>(() => getSkippedIds())

  const [completing, setCompleting] = useState(false)

  const task = useMemo(() => selectTask(localTodos, skipped), [localTodos, skipped])

  const isOwn = task ? task.user_id === myUserId : false
  const today = format(new Date(), 'yyyy-MM-dd')
  const isOverdue = !!(task?.due_date && task.due_date < today)

  async function handleDone() {
    if (!task || completing) return
    setCompleting(true)

    await useTodoStore.getState().toggleTodo(task.id, true)

    if (task.recurrence) {
      const days = task.recurrence === 'daily' ? 1 : task.recurrence === 'weekly' ? 7 : 30
      const due = format(addDays(new Date(), days), 'yyyy-MM-dd')
      setTimeout(async () => {
        await useTodoStore.getState().updateTodo(task.id, { completed: false, due_date: due })
        setCompleting(false)
      }, 1500)
    } else {
      setCompleting(false)
    }
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

    const next = new Set(skipped)
    next.add(task.id)
    saveSkippedIds(next)
    setSkipped(next)

    await useTodoStore.getState().updateTodo(task.id, { due_date: newDate })
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-8 flex-1">
        <div className="text-5xl mb-4">🎉</div>
        <p className="text-xl font-semibold mb-2 text-foreground">You&apos;re all clear</p>
        <p className="text-base text-muted-foreground">Nothing left to do right now.</p>
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ backgroundColor: 'transparent' }}
      animate={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}
      className="flex flex-col items-center justify-center px-4 py-12 flex-1 overflow-y-auto"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={task.id}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1.02, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-[360px] rounded-2xl p-8 flex flex-col gap-6 bg-card border border-border shadow-[0_8px_30px_rgb(0,181,200,0.12)]"
        >
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
              className="w-full font-semibold text-sm rounded-xl transition bg-primary text-primary-foreground min-h-[52px] cursor-pointer"
              style={{ opacity: completing ? 0.6 : 1 }}
            >
              Done
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 text-sm rounded-xl transition text-muted-foreground hover:bg-foam min-h-[44px] cursor-pointer"
              >
                Skip
              </button>
              <button
                onClick={handleLater}
                className="flex-1 text-sm rounded-xl transition text-muted-foreground hover:bg-foam min-h-[44px] cursor-pointer"
              >
                Later
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
