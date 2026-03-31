'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, Check, GripVertical } from 'lucide-react'
import { format } from 'date-fns'
import { Todo, CalendarEvent } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import DayTimeline from '@/components/DayTimeline'
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

type Message = { role: 'user' | 'assistant'; content: string }

interface Props {
  userName: string
  myTodos: Todo[]
  allEvents: CalendarEvent[]
  onDone: () => void
}

interface DraggableTodoItemProps {
  todo: Todo
  isOverdue: boolean
  today: string
  onCheck: (id: string) => void
}

function DraggableTodoItem({ todo, isOverdue, today, onCheck }: DraggableTodoItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: todo.id })
  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity: isDragging ? 0.4 : 1,
        transform: CSS.Translate.toString(transform),
      }}
    >
      <button
        onClick={() => onCheck(todo.id)}
        style={{
          flexShrink: 0,
          width: 20,
          height: 20,
          border: `1.5px solid ${isOverdue ? 'var(--color-alert)' : 'var(--color-border)'}`,
          borderRadius: 4,
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Check size={11} strokeWidth={3} style={{ color: 'var(--color-completion)', opacity: 0 }} />
      </button>
      <span
        style={{
          flex: 1,
          fontSize: 13,
          lineHeight: 1.3,
          color: isOverdue ? 'var(--color-alert)' : 'var(--color-text)',
        }}
      >
        {todo.title}
      </span>
      {isOverdue && (
        <span style={{ fontSize: 11, color: 'var(--color-alert)', opacity: 0.7, flexShrink: 0 }}>
          overdue
        </span>
      )}
      <button
        {...listeners}
        {...attributes}
        style={{
          flexShrink: 0,
          cursor: 'grab',
          color: 'var(--color-text-disabled)',
          display: 'flex',
          alignItems: 'center',
          touchAction: 'none',
        }}
      >
        <GripVertical size={14} />
      </button>
    </div>
  )
}

const CHECKIN_KEY = 'checkin_last_date'

export function hasCheckedInToday(): boolean {
  try {
    return localStorage.getItem(CHECKIN_KEY) === format(new Date(), 'yyyy-MM-dd')
  } catch {
    return false
  }
}

export function markCheckedIn(): void {
  try {
    localStorage.setItem(CHECKIN_KEY, format(new Date(), 'yyyy-MM-dd'))
  } catch {}
}

async function readStream(res: Response, onToken: (t: string) => void): Promise<void> {
  if (!res.body) throw new Error('No response body')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    onToken(decoder.decode(value, { stream: true }))
  }
}

export default function CheckIn({ userName, myTodos, allEvents, onDone }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  // Local copy of todos so inline completions and schedule changes are reflected immediately
  const [localTodos, setLocalTodos] = useState<Todo[]>(myTodos)
  const [activeDragTodo, setActiveDragTodo] = useState<Todo | null>(null)

  // Checklist: due/overdue, not completed, not yet scheduled on the timeline
  const checklistTodos = localTodos.filter(
    (t) => !t.completed && !!t.due_date && t.due_date <= today && !t.scheduled_time,
  )

  // Todos placed on the timeline
  const scheduledTodos = localTodos.filter((t) => !t.completed && !!t.scheduled_time)

  // Derived shapes used in API calls
  const overdueTodos = localTodos
    .filter((t): t is Todo & { due_date: string } => !t.completed && !!t.due_date && t.due_date < today)
    .map((t) => ({ id: t.id, title: t.title, due_date: t.due_date }))

  const pendingTodos = localTodos
    .filter((t) => !t.completed)
    .map((t) => ({ title: t.title, due_date: t.due_date }))

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [waiting, setWaiting] = useState(true)
  const [responding, setResponding] = useState(false)
  const [userMessageCount, setUserMessageCount] = useState(0)
  const [wrappingUp, setWrappingUp] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function run() {
      setWaiting(true)
      setResponding(true)
      setMessages([{ role: 'assistant', content: '' }])
      try {
        const res = await fetch('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'greet', userName, pendingTodos }),
          signal: controller.signal,
        })
        await readStream(res, (token) => {
          if (controller.signal.aborted) return
          setWaiting(false)
          setMessages(([msg]) => [{ ...msg, content: msg.content + token }])
        })
      } catch {
        if (controller.signal.aborted) return
        setMessages([{ role: 'assistant', content: `Hey ${userName}! What's on your mind today?` }])
      } finally {
        if (!controller.signal.aborted) {
          setWaiting(false)
          setResponding(false)
          inputRef.current?.focus()
        }
      }
    }

    run()
    return () => controller.abort()
  }, [userName])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, waiting])

  async function handleTodoCheck(todoId: string) {
    setLocalTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, completed: true } : t)))
    await supabase.from('todos').update({ completed: true }).eq('id', todoId)
  }

  function handleDragStart(event: DragStartEvent) {
    const todo = localTodos.find((t) => t.id === event.active.id)
    setActiveDragTodo(todo ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragTodo(null)
    const { active, over } = event
    if (!over) return

    const todoId = active.id as string
    const hour = parseInt((over.id as string).replace('hour-', ''))
    if (isNaN(hour)) return

    const scheduledTime = `${hour.toString().padStart(2, '0')}:00:00`
    setLocalTodos((prev) =>
      prev.map((t) => (t.id === todoId ? { ...t, scheduled_time: scheduledTime } : t)),
    )
    await supabase.from('todos').update({ scheduled_time: scheduledTime }).eq('id', todoId)
  }

  async function sendMessage() {
    if (!input.trim() || waiting || responding || wrappingUp) return

    const text = input.trim()
    setInput('')

    const isFirstUserMessage = userMessageCount === 0
    setUserMessageCount((n) => n + 1)

    const history: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(history)
    setWaiting(true)
    setResponding(true)

    const withPlaceholder: Message[] = [...history, { role: 'assistant', content: '' }]
    setMessages(withPlaceholder)

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          messages: history,
          userName,
          overdueTodos,
          pendingTodos,
          isFirstUserMessage,
        }),
      })
      await readStream(res, (token) => {
        setWaiting(false)
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          updated[updated.length - 1] = { ...last, content: last.content + token }
          return updated
        })
      })
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Something went wrong — try again?',
        }
        return updated
      })
    } finally {
      setWaiting(false)
      setResponding(false)
      inputRef.current?.focus()
    }
  }

  async function handleWrapUp() {
    setWrappingUp(true)
    try {
      await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finalize', messages, overdueTodos }),
      })
    } finally {
      markCheckedIn()
      onDone()
    }
  }

  function handleDismiss() {
    markCheckedIn()
    onDone()
  }

  const isBusy = waiting || responding || wrappingUp
  const canWrapUp = userMessageCount >= 1 && !isBusy

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(26,26,46,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full flex flex-col"
        style={{
          maxWidth: '440px',
          height: 'calc(100vh - 2rem)',
          background: 'var(--background)',
          borderRadius: '20px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 48px rgba(0,181,200,0.14)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Daily check-in
          </span>
          <button
            onClick={handleDismiss}
            className="w-7 h-7 flex items-center justify-center rounded-full transition"
            style={{ background: 'var(--color-foam)', color: 'var(--color-text-secondary)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 min-h-0">
          {messages.map((msg, i) => {
            const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1
            const showDots = isLastAssistant && waiting && msg.content === ''

            return (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {showDots ? (
                  <div
                    className="flex gap-1 items-center"
                    style={{
                      padding: '12px 16px',
                      borderRadius: '18px 18px 18px 4px',
                      background: '#fff',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {[0, 1, 2].map((j) => (
                      <span
                        key={j}
                        className="block w-1.5 h-1.5 rounded-full"
                        style={{
                          background: 'var(--color-text-disabled)',
                          animation: `checkin-bounce 1.2s ease-in-out ${j * 0.15}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      maxWidth: '85%',
                      padding: '10px 16px',
                      borderRadius:
                        msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      ...(msg.role === 'user'
                        ? { background: 'var(--color-primary)', color: '#fff' }
                        : {
                            background: '#fff',
                            color: 'var(--color-text)',
                            border: '1px solid var(--color-border)',
                          }),
                    }}
                  >
                    {msg.content}
                  </p>
                )}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Task checklist — overdue + due today */}
        {checklistTodos.length > 0 && (
          <div
            className="shrink-0 px-5 py-3"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {overdueTodos.length > 0 ? 'Overdue & due today' : 'Due today'}
            </p>
            <div className="flex flex-col gap-1.5">
              {checklistTodos.map((todo) => (
                <DraggableTodoItem
                  key={todo.id}
                  todo={todo}
                  isOverdue={todo.due_date! < today}
                  today={today}
                  onCheck={handleTodoCheck}
                />
              ))}
            </div>
          </div>
        )}

        {/* Day timeline */}
        <div
          className="shrink-0 px-5 pt-3 pb-2"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Today
          </p>
          <DayTimeline
            events={allEvents}
            todos={scheduledTodos}
            onTodoComplete={handleTodoCheck}
          />
        </div>

        {/* Wrap up */}
        {canWrapUp && (
          <div className="px-5 pt-1 pb-2 shrink-0">
            <button
              onClick={handleWrapUp}
              className="w-full text-sm font-medium rounded-xl transition"
              style={{
                background: 'var(--color-foam)',
                color: 'var(--color-primary)',
                minHeight: '40px',
                border: '1px solid var(--color-border)',
              }}
            >
              All done — wrap up ✓
            </button>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
          className="flex items-center gap-2 px-4 py-3 shrink-0"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={userMessageCount === 0 ? "What's on your mind…" : 'Reply…'}
            disabled={isBusy}
            className="flex-1 text-sm rounded-xl px-4 focus:outline-none"
            style={{
              background: '#fff',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-text)',
              minHeight: '44px',
              opacity: isBusy ? 0.5 : 1,
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isBusy}
            className="shrink-0 flex items-center justify-center rounded-xl transition"
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              width: '44px',
              height: '44px',
              opacity: !input.trim() || isBusy ? 0.35 : 1,
            }}
          >
            <Send size={15} />
          </button>
        </form>
      </div>

      <style>{`
        @keyframes checkin-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>

    <DragOverlay>
      {activeDragTodo && (
        <div
          style={{
            background: '#fff',
            border: '1.5px solid var(--color-primary)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 13,
            color: 'var(--color-text)',
            boxShadow: '0 4px 16px rgba(0,181,200,0.2)',
            maxWidth: 280,
          }}
        >
          {activeDragTodo.title}
        </div>
      )}
    </DragOverlay>
    </DndContext>
  )
}
