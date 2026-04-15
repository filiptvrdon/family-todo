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
const GUTTER_WIDTH = 52
const ROW_HEIGHT = 72               // px per hour
const PX_PER_MIN = ROW_HEIGHT / 60  // 1.2 px / min
const TOTAL_HEIGHT = (END_HOUR - START_HOUR + 1) * ROW_HEIGHT

function formatHour(h: number): string {
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

/** Convert a Date to its pixel offset from the top of the grid. */
function calcTopPx(date: Date): number {
  const mins = date.getHours() * 60 + date.getMinutes() - START_HOUR * 60
  return Math.max(0, mins * PX_PER_MIN)
}

// ── Invisible droppable zone per hour (for todo scheduling DnD) ──────────────
function HourDropzone({ hour }: { hour: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `hour-${hour}` })
  return (
    <div
      ref={setNodeRef}
      data-hour={hour}
      style={{
        position: 'absolute',
        top: (hour - START_HOUR) * ROW_HEIGHT,
        left: GUTTER_WIDTH,
        right: 0,
        height: ROW_HEIGHT,
        background: isOver ? 'rgba(0,181,200,0.12)' : 'transparent',
        borderRadius: isOver ? 4 : 0,
        transition: 'background 0.1s',
        zIndex: 1,
      }}
    />
  )
}

// ── Draggable todo chip (absolutely positioned) ───────────────────────────────
function DraggableTimelineTodo({
  todo, onComplete, topPx,
}: {
  todo: Todo
  onComplete: (id: string) => void
  topPx: number
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
    disabled: todo.completed,
  })
  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        top: topPx + 2,
        left: GUTTER_WIDTH + 4,
        right: 4,
        background: todo.completed ? 'transparent' : 'var(--color-foam)',
        border: `1px solid ${todo.completed ? 'transparent' : 'var(--color-border)'}`,
        borderRadius: 6,
        padding: '4px 8px',
        fontSize: 12,
        color: todo.completed ? 'var(--color-text-disabled)' : 'var(--color-text)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        overflow: 'hidden',
        opacity: isDragging ? 0.4 : todo.completed ? 0.6 : 1,
        transform: CSS.Translate.toString(transform),
        zIndex: 3,
        minHeight: 28,
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
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: todo.completed ? 'line-through' : 'none' }}>
        {todo.title}
      </span>
      {!todo.completed && (
        <button
          {...attributes}
          {...listeners}
          style={{ flexShrink: 0, cursor: 'grab', color: 'var(--color-text-disabled)', display: 'flex', alignItems: 'center', touchAction: 'none' }}
        >
          <GripVertical size={12} />
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  events: CalendarEvent[]
  todos: Todo[]
  onTodoComplete: (todoId: string) => void
  expand?: boolean
  date?: Date
}

export default function DayTimeline({ events, todos, onTodoComplete, expand = false, date = new Date() }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const gridRef  = useRef<HTMLDivElement>(null)
  const updateEvent = useEventStore(s => s.updateEvent)

  const dateKey  = format(date, 'yyyy-MM-dd')
  const isToday  = dateKey === format(new Date(), 'yyyy-MM-dd')
  const now      = new Date()
  const nowTopPx = (now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) * PX_PER_MIN

  const todayEvents = events.filter(e => format(new Date(e.start_time), 'yyyy-MM-dd') === dateKey)
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR)

  // ── Drag-to-move refs/state ───────────────────────────────────────────────
  const dragDataRef  = useRef<{ eventId: string; durationMs: number; grabOffsetPx: number } | null>(null)
  const ghostTopRef  = useRef<number | null>(null)
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null)
  const [ghostTopPx,      setGhostTopPx]      = useState<number | null>(null)

  // ── Resize refs/state ─────────────────────────────────────────────────────
  const resizeDataRef    = useRef<{ eventId: string; originalEndMs: number; originalStartMs: number; startY: number } | null>(null)
  const resizePreviewRef = useRef<{ eventId: string; endTime: Date } | null>(null)
  const [resizePreviewEnd, setResizePreviewEnd] = useState<{ eventId: string; endTime: Date } | null>(null)

  // Scroll to current hour on mount
  useEffect(() => {
    const h = Math.max(START_HOUR, Math.min(END_HOUR, new Date().getHours() - 1))
    scrollRef.current?.querySelector(`[data-scroll-hour="${h}"]`)?.scrollIntoView({ block: 'start' })
  }, [])

  // ── Event drag-to-move ────────────────────────────────────────────────────
  function startEventDrag(e: React.PointerEvent, event: CalendarEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!gridRef.current) return

    const gridRect     = gridRef.current.getBoundingClientRect()
    const grabOffsetPx = e.clientY - gridRect.top - calcTopPx(new Date(event.start_time))
    const durationMs   = new Date(event.end_time).getTime() - new Date(event.start_time).getTime()
    const startX = e.clientX, startY = e.clientY
    let active = false

    function onMove(ev: PointerEvent) {
      if (!active) {
        if (Math.sqrt((ev.clientX - startX) ** 2 + (ev.clientY - startY) ** 2) < 6) return
        active = true
        dragDataRef.current = { eventId: event.id, durationMs, grabOffsetPx }
        setDraggingEventId(event.id)
      }
      if (!gridRef.current || !dragDataRef.current) return
      const rect     = gridRef.current.getBoundingClientRect()
      const rawMins  = (ev.clientY - rect.top - dragDataRef.current.grabOffsetPx) / PX_PER_MIN
      const snapMins = Math.round(rawMins / 15) * 15
      const newTop   = Math.max(0, Math.min((END_HOUR - START_HOUR) * 60, snapMins)) * PX_PER_MIN
      ghostTopRef.current = newTop
      setGhostTopPx(newTop)
    }

    function onUp() {
      if (active && dragDataRef.current && ghostTopRef.current !== null) {
        const startMins = ghostTopRef.current / PX_PER_MIN + START_HOUR * 60
        const h = Math.floor(startMins / 60)
        const m = Math.round(startMins % 60)
        const newStart = new Date(`${dateKey}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`)
        updateEvent(dragDataRef.current.eventId, {
          start_time: newStart.toISOString(),
          end_time: new Date(newStart.getTime() + dragDataRef.current.durationMs).toISOString(),
        })
      }
      dragDataRef.current = null
      ghostTopRef.current = null
      setDraggingEventId(null)
      setGhostTopPx(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
  }

  // ── Event resize ──────────────────────────────────────────────────────────
  function startEventResize(e: React.PointerEvent, event: CalendarEvent) {
    e.preventDefault()
    e.stopPropagation()
    resizeDataRef.current = {
      eventId: event.id,
      originalEndMs:   new Date(event.end_time).getTime(),
      originalStartMs: new Date(event.start_time).getTime(),
      startY: e.clientY,
    }
    const initial = { eventId: event.id, endTime: new Date(event.end_time) }
    resizePreviewRef.current = initial
    setResizePreviewEnd(initial)

    function onMove(ev: PointerEvent) {
      if (!resizeDataRef.current) return
      const deltaMin = Math.round((ev.clientY - resizeDataRef.current.startY) / PX_PER_MIN / 15) * 15
      const raw  = resizeDataRef.current.originalEndMs + deltaMin * 60000
      const minE = resizeDataRef.current.originalStartMs + 30 * 60000
      const end  = new Date(Math.max(raw, minE))
      const preview = { eventId: resizeDataRef.current.eventId, endTime: end }
      resizePreviewRef.current = preview
      setResizePreviewEnd({ ...preview })
    }

    function onUp() {
      if (resizeDataRef.current && resizePreviewRef.current) {
        updateEvent(resizeDataRef.current.eventId, { end_time: resizePreviewRef.current.endTime.toISOString() })
      }
      resizeDataRef.current  = null
      resizePreviewRef.current = null
      setResizePreviewEnd(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={scrollRef}
      style={{ overflowY: 'auto', padding: '0 12px', ...(expand ? { flex: 1 } : { height: 192 }) }}
    >
      {/* Absolute-positioned time grid */}
      <div ref={gridRef} style={{ position: 'relative', height: TOTAL_HEIGHT }}>

        {/* Hour lines + labels */}
        {hours.map(hour => {
          const top      = (hour - START_HOUR) * ROW_HEIGHT
          const isCurr   = isToday && now.getHours() === hour
          return (
            <div
              key={hour}
              data-scroll-hour={hour}
              style={{ position: 'absolute', top, left: 0, right: 0, height: ROW_HEIGHT, pointerEvents: 'none' }}
            >
              <span style={{
                position: 'absolute', top: 8, left: 0,
                width: GUTTER_WIDTH - 4, paddingRight: 8,
                fontSize: 11, fontWeight: isCurr ? 600 : 400,
                color: isCurr ? 'var(--color-primary)' : 'var(--color-text-disabled)',
                letterSpacing: '0.01em', textAlign: 'right', userSelect: 'none',
              }}>
                {formatHour(hour)}
              </span>
              <div style={{
                position: 'absolute', top: 0, left: GUTTER_WIDTH, right: 0, height: 1,
                background: isCurr ? 'var(--color-primary)' : 'var(--color-border)',
                opacity: isCurr ? 1 : 0.7,
              }} />
            </div>
          )
        })}

        {/* Invisible droppable zones for todo DnD */}
        {hours.map(hour => <HourDropzone key={hour} hour={hour} />)}

        {/* Current time indicator */}
        {isToday && nowTopPx >= 0 && nowTopPx <= TOTAL_HEIGHT && (
          <div style={{
            position: 'absolute', top: nowTopPx, left: GUTTER_WIDTH - 6, right: 0,
            height: 2, background: 'var(--color-primary)', zIndex: 4, pointerEvents: 'none',
          }}>
            <div style={{
              position: 'absolute', left: -4, top: -4,
              width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary)',
            }} />
          </div>
        )}

        {/* Calendar events — sized and positioned by actual start/end time */}
        {todayEvents.map(event => {
          const isGhost  = draggingEventId === event.id
          const preview  = resizePreviewEnd?.eventId === event.id ? resizePreviewEnd : null
          const start    = new Date(event.start_time)
          const end      = preview?.endTime ?? new Date(event.end_time)
          const top      = calcTopPx(start)
          const durMin   = (end.getTime() - start.getTime()) / 60000
          const height   = Math.max(24, durMin * PX_PER_MIN)
          const compact  = height < 42

          return (
            <div
              key={event.id}
              style={{
                position: 'absolute',
                top, left: GUTTER_WIDTH + 4, right: 4, height,
                background: 'var(--color-primary)',
                borderRadius: 6, overflow: 'hidden',
                opacity: isGhost ? 0.3 : 1,
                zIndex: 2,
              }}
            >
              {/* Draggable body */}
              <div
                onPointerDown={ev => !isGhost && startEventDrag(ev, event)}
                style={{
                  position: 'absolute', inset: 0, bottom: isGhost ? 0 : 7,
                  cursor: isGhost ? 'grabbing' : 'grab',
                  padding: compact ? '3px 8px' : '6px 8px',
                  display: 'flex', flexDirection: compact ? 'row' : 'column',
                  alignItems: compact ? 'center' : 'flex-start',
                  gap: compact ? 6 : 2,
                  touchAction: 'none', userSelect: 'none', overflow: 'hidden',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 12, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: compact ? '1 1 auto' : undefined }}>
                  {event.title}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {format(start, 'h:mm')}–{format(end, 'h:mma')}
                </span>
              </div>
              {/* Resize handle */}
              {!isGhost && (
                <div
                  onPointerDown={ev => startEventResize(ev, event)}
                  style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 7,
                    cursor: 'ns-resize', background: 'rgba(0,0,0,0.22)',
                    borderRadius: '0 0 6px 6px', touchAction: 'none',
                  }}
                />
              )}
            </div>
          )
        })}

        {/* Ghost preview while dragging */}
        {draggingEventId !== null && ghostTopPx !== null && dragDataRef.current && (() => {
          const height = Math.max(24, (dragDataRef.current.durationMs / 60000) * PX_PER_MIN)
          return (
            <div style={{
              position: 'absolute',
              top: ghostTopPx, left: GUTTER_WIDTH + 4, right: 4, height,
              background: 'var(--color-primary)', borderRadius: 6, opacity: 0.5,
              zIndex: 6, pointerEvents: 'none',
              border: '2px dashed rgba(255,255,255,0.7)', boxSizing: 'border-box',
            }} />
          )
        })()}

        {/* Scheduled todos positioned at their time */}
        {todos
          .filter(t => t.scheduled_time && (t.due_date === dateKey))
          .map(t => {
            const [hh, mm = 0] = (t.scheduled_time ?? '00:00').split(':').map(Number)
            const top = Math.max(0, (hh * 60 + mm - START_HOUR * 60) * PX_PER_MIN)
            return <DraggableTimelineTodo key={t.id} todo={t} onComplete={onTodoComplete} topPx={top} />
          })}

      </div>
    </div>
  )
}
