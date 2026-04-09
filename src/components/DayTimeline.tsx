'use client'

import { useEffect, useRef, useState } from 'react'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { CalendarEvent, Todo } from '@/lib/types'
import { useEventStore } from '@/stores/event-store'
import { format } from 'date-fns'
import { Check, GripVertical } from 'lucide-react'

const START_HOUR = 5
const END_HOUR = 20
const ROW_HEIGHT = 72  // px per hour — matches WeekCalendar

function formatHour(h: number): string {
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

interface HourRowProps {
  hour: number
  isCurrent: boolean
  events: CalendarEvent[]
  todos: Todo[]
  onTodoComplete: (todoId: string) => void
  ghostEventId: string | null
  resizePreviewEnd: { eventId: string; endTime: Date } | null
  isEventDragTarget: boolean
  onPointerEnter: () => void
  onEventPointerDown: (e: React.PointerEvent, event: CalendarEvent) => void
  onResizePointerDown: (e: React.PointerEvent, event: CalendarEvent) => void
}

function DraggableTimelineTodo({ todo, onComplete }: { todo: Todo; onComplete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: todo.id, disabled: todo.completed })
  return (
    <div
      ref={setNodeRef}
      style={{
        background: todo.completed ? 'transparent' : 'var(--color-foam)',
        border: `1px solid ${todo.completed ? 'transparent' : 'var(--color-border)'}`,
        borderRadius: 6,
        padding: '5px 8px',
        fontSize: 13,
        color: todo.completed ? 'var(--color-text-disabled)' : 'var(--color-text)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        overflow: 'hidden',
        opacity: isDragging ? 0.4 : todo.completed ? 0.6 : 1,
        transform: CSS.Translate.toString(transform),
      }}
    >
      <button
        onClick={() => !todo.completed && onComplete(todo.id)}
        style={{
          flexShrink: 0,
          width: 14,
          height: 14,
          border: `1.5px solid ${todo.completed ? 'var(--color-completion)' : 'var(--color-border)'}`,
          borderRadius: 3,
          background: todo.completed ? 'var(--color-completion)' : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: todo.completed ? 'default' : 'pointer',
        }}
      >
        <Check size={9} strokeWidth={3} style={{ color: '#fff', opacity: todo.completed ? 1 : 0 }} />
      </button>
      <span style={{ flex: 1, wordBreak: 'break-word', textDecoration: todo.completed ? 'line-through' : 'none' }}>
        {todo.title}
      </span>
      {!todo.completed && (
        <button
          {...attributes}
          {...listeners}
          style={{
            flexShrink: 0,
            cursor: 'grab',
            color: 'var(--color-text-disabled)',
            display: 'flex',
            alignItems: 'center',
            touchAction: 'none',
          }}
        >
          <GripVertical size={12} />
        </button>
      )}
    </div>
  )
}

function HourRow({
  hour, isCurrent, events, todos, onTodoComplete,
  ghostEventId, resizePreviewEnd, isEventDragTarget,
  onPointerEnter, onEventPointerDown, onResizePointerDown,
}: HourRowProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `hour-${hour}` })
  const hasItems = events.length > 0 || todos.length > 0

  return (
    <div
      ref={setNodeRef}
      data-hour={hour}
      onPointerEnter={onPointerEnter}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        height: ROW_HEIGHT,
        overflow: 'hidden',
        background: isEventDragTarget
          ? 'rgba(0,181,200,0.12)'
          : isOver
            ? 'rgba(0,181,200,0.1)'
            : isCurrent
              ? 'rgba(0,181,200,0.05)'
              : 'transparent',
        borderRadius: isOver ? 6 : 0,
        transition: 'background 0.15s',
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          width: 52,
          fontSize: 12,
          fontWeight: isCurrent ? 600 : 400,
          color: isCurrent ? 'var(--color-primary)' : 'var(--color-text-disabled)',
          paddingTop: 10,
          flexShrink: 0,
          letterSpacing: '0.01em',
        }}
      >
        {formatHour(hour)}
      </span>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          borderTop: `1px solid ${isOver ? 'var(--color-primary)' : isCurrent ? 'var(--color-primary)' : 'var(--color-border)'}`,
          marginTop: 10,
          paddingTop: hasItems ? 5 : 0,
          paddingBottom: hasItems ? 5 : 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          overflow: 'hidden',
        }}
      >
        {events.map(e => {
          const isGhost = ghostEventId === e.id
          const preview = resizePreviewEnd?.eventId === e.id ? resizePreviewEnd : null
          const endTime = preview?.endTime ?? new Date(e.end_time)
          return (
            <div key={e.id} style={{ position: 'relative', flexShrink: 0 }}>
              <div
                onPointerDown={ev => !isGhost && onEventPointerDown(ev, e)}
                style={{
                  background: 'var(--color-primary)',
                  borderRadius: 6,
                  padding: '5px 8px',
                  fontSize: 12,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  overflow: 'hidden',
                  cursor: isGhost ? 'grabbing' : 'grab',
                  opacity: isGhost ? 0.35 : 1,
                  userSelect: 'none',
                  touchAction: 'none',
                }}
              >
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                  {e.title}
                </span>
                <span style={{ opacity: 0.75, flexShrink: 0, fontSize: 11 }}>
                  {format(new Date(e.start_time), 'h:mm')}–{format(endTime, 'h:mma')}
                </span>
              </div>
              {!isGhost && (
                <div
                  onPointerDown={ev => onResizePointerDown(ev, e)}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 2,
                    right: 2,
                    height: 5,
                    cursor: 'ns-resize',
                    background: 'rgba(0,0,0,0.18)',
                    borderRadius: '0 0 5px 5px',
                    touchAction: 'none',
                  }}
                />
              )}
            </div>
          )
        })}

        {todos.map(t => (
          <DraggableTimelineTodo key={t.id} todo={t} onComplete={onTodoComplete} />
        ))}
      </div>
    </div>
  )
}

interface Props {
  events: CalendarEvent[]
  todos: Todo[]
  onTodoComplete: (todoId: string) => void
  expand?: boolean
  date?: Date
}

export default function DayTimeline({ events, todos, onTodoComplete, expand = false, date = new Date() }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const updateEvent = useEventStore(s => s.updateEvent)
  const dateKey = format(date, 'yyyy-MM-dd')
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const currentHour = new Date().getHours()
  const isToday = dateKey === todayKey

  const todayEvents = events.filter(e => format(new Date(e.start_time), 'yyyy-MM-dd') === dateKey)
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR)

  // ── Event drag-to-move ──
  const dragEventDataRef = useRef<{ eventId: string; durationMs: number } | null>(null)
  const dragTargetHourRef = useRef<number | null>(null)
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null)
  const [dragHighlightHour, setDragHighlightHour] = useState<number | null>(null)

  // ── Event resize ──
  const resizeDataRef = useRef<{
    eventId: string
    originalEndMs: number
    originalStartMs: number
    startY: number
  } | null>(null)
  const resizePreviewRef = useRef<{ eventId: string; endTime: Date } | null>(null)
  const [resizePreviewEnd, setResizePreviewEnd] = useState<{ eventId: string; endTime: Date } | null>(null)

  useEffect(() => {
    const scrollToHour = Math.max(START_HOUR, Math.min(END_HOUR, currentHour - 1))
    containerRef.current
      ?.querySelector(`[data-hour="${scrollToHour}"]`)
      ?.scrollIntoView({ block: 'start' })
  }, [currentHour])

  function startEventDrag(e: React.PointerEvent, event: CalendarEvent) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    let dragging = false

    function onPointerMove(ev: PointerEvent) {
      if (dragging) return
      const dist = Math.sqrt((ev.clientX - startX) ** 2 + (ev.clientY - startY) ** 2)
      if (dist < 6) return
      dragging = true
      const durationMs = new Date(event.end_time).getTime() - new Date(event.start_time).getTime()
      dragEventDataRef.current = { eventId: event.id, durationMs }
      const initialHour = new Date(event.start_time).getHours()
      dragTargetHourRef.current = initialHour
      setDraggingEventId(event.id)
      setDragHighlightHour(initialHour)
    }

    function onPointerUp() {
      if (dragging) {
        const targetHour = dragTargetHourRef.current
        const data = dragEventDataRef.current
        if (targetHour !== null && data) {
          const h = String(targetHour).padStart(2, '0')
          const newStart = new Date(`${dateKey}T${h}:00:00`)
          const newEnd = new Date(newStart.getTime() + data.durationMs)
          updateEvent(data.eventId, {
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
          })
        }
        dragEventDataRef.current = null
        dragTargetHourRef.current = null
        setDraggingEventId(null)
        setDragHighlightHour(null)
      }
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp, { once: true })
  }

  function handleRowPointerEnter(hour: number) {
    if (dragEventDataRef.current) {
      dragTargetHourRef.current = hour
      setDragHighlightHour(hour)
    }
  }

  function startEventResize(e: React.PointerEvent, event: CalendarEvent) {
    e.preventDefault()
    e.stopPropagation()
    const data = {
      eventId: event.id,
      originalEndMs: new Date(event.end_time).getTime(),
      originalStartMs: new Date(event.start_time).getTime(),
      startY: e.clientY,
    }
    resizeDataRef.current = data
    const initial = { eventId: event.id, endTime: new Date(event.end_time) }
    resizePreviewRef.current = initial
    setResizePreviewEnd(initial)

    function onPointerMove(ev: PointerEvent) {
      if (!resizeDataRef.current) return
      const deltaY = ev.clientY - resizeDataRef.current.startY
      const deltaMinutes = Math.round((deltaY / ROW_HEIGHT) * 60 / 15) * 15
      const newEndMs = resizeDataRef.current.originalEndMs + deltaMinutes * 60000
      const minEndMs = resizeDataRef.current.originalStartMs + 30 * 60000
      const clampedEnd = new Date(Math.max(newEndMs, minEndMs))
      const preview = { eventId: resizeDataRef.current.eventId, endTime: clampedEnd }
      resizePreviewRef.current = preview
      setResizePreviewEnd({ ...preview })
    }

    function onPointerUp() {
      if (resizeDataRef.current && resizePreviewRef.current) {
        updateEvent(resizeDataRef.current.eventId, {
          end_time: resizePreviewRef.current.endTime.toISOString(),
        })
      }
      resizeDataRef.current = null
      resizePreviewRef.current = null
      setResizePreviewEnd(null)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp, { once: true })
  }

  return (
    <div ref={containerRef} style={{ overflowY: 'auto', padding: '0 12px', ...(expand ? { flex: 1 } : { height: 192 }) }}>
      {hours.map(hour => {
        const hourEvents = todayEvents.filter(e => new Date(e.start_time).getHours() === hour)
        const hourTodos = todos.filter(t => t.scheduled_time && parseInt(t.scheduled_time.split(':')[0]) === hour && (!t.completed || t.due_date === dateKey))

        return (
          <HourRow
            key={hour}
            hour={hour}
            isCurrent={isToday && hour === currentHour}
            events={hourEvents}
            todos={hourTodos}
            onTodoComplete={onTodoComplete}
            ghostEventId={draggingEventId}
            resizePreviewEnd={resizePreviewEnd}
            isEventDragTarget={dragHighlightHour === hour}
            onPointerEnter={() => handleRowPointerEnter(hour)}
            onEventPointerDown={(e, event) => startEventDrag(e, event)}
            onResizePointerDown={(e, event) => startEventResize(e, event)}
          />
        )
      })}
    </div>
  )
}