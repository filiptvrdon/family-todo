'use client'

import { useEffect, useRef, useState } from 'react'
import {
  format, addWeeks, subWeeks, startOfWeek, endOfWeek,
  eachDayOfInterval, isToday, isSameWeek,
} from 'date-fns'
import { useDroppable } from '@dnd-kit/core'
import { CalendarEvent, Todo } from '@/lib/types'
import { useCalendarData } from './useCalendarData'
import { useEventStore } from '@/stores/event-store'
import CalendarNav from './CalendarNav'
import EventChip from './EventChip'
import NewEventForm from './NewEventForm'

const START_HOUR = 5
const END_HOUR = 20
const GUTTER_WIDTH = 52
const ROW_HEIGHT = 72  // px per hour — 1.2 px per minute

function formatHour(h: number): string {
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

interface SlotCellProps {
  date: string
  hour: number
  events: CalendarEvent[]
  todos: Todo[]
  isCurrentHour: boolean
  isTodoDragging: boolean
  isEventDragTarget: boolean
  myColor: string
  partnerColor: string
  myUserId: string
  ghostEventId: string | null
  resizePreviewEnd: { eventId: string; endTime: Date } | null
  onPointerEnter: () => void
  onEventPointerDown: (e: React.PointerEvent, event: CalendarEvent) => void
  onResizePointerDown: (e: React.PointerEvent, event: CalendarEvent) => void
}

function WeekSlotCell({
  date, hour, events, todos, isCurrentHour, isTodoDragging, isEventDragTarget,
  myColor, partnerColor, myUserId, ghostEventId, resizePreviewEnd,
  onPointerEnter, onEventPointerDown, onResizePointerDown,
}: SlotCellProps) {
  const id = `week-slot-${date}-${String(hour).padStart(2, '0')}`
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !isTodoDragging })

  const hasItems = events.length > 0 || todos.length > 0

  return (
    <div
      ref={setNodeRef}
      data-hour={hour}
      onPointerEnter={onPointerEnter}
      style={{
        borderTop: `1px solid ${
          isOver && isTodoDragging
            ? 'var(--color-primary)'
            : isCurrentHour
              ? 'var(--color-primary)'
              : 'var(--color-border)'
        }`,
        borderLeft: '1px solid var(--color-border)',
        height: ROW_HEIGHT,
        padding: hasItems ? '4px 5px' : '0 5px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflow: 'hidden',
        background: isEventDragTarget
          ? 'rgba(0,181,200,0.15)'
          : isOver && isTodoDragging
            ? 'rgba(0,181,200,0.12)'
            : isCurrentHour
              ? 'rgba(0,181,200,0.04)'
              : 'transparent',
        transition: 'background 0.1s',
        boxSizing: 'border-box',
      }}
    >
      {events.map(event => {
        const isGhost = ghostEventId === event.id
        const preview = resizePreviewEnd?.eventId === event.id ? resizePreviewEnd : null
        return (
          <div key={event.id} style={{ position: 'relative', flexShrink: 0 }}>
            <div
              onPointerDown={e => !isGhost && onEventPointerDown(e, event)}
              style={{ cursor: isGhost ? 'grabbing' : 'grab', touchAction: 'none' }}
            >
              <EventChip
                event={event}
                color={event.user_id === myUserId ? myColor : partnerColor}
                showTime
                isGhost={isGhost}
                previewEndTime={preview?.endTime}
              />
            </div>
            {!isGhost && (
              <div
                onPointerDown={e => onResizePointerDown(e, event)}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 2,
                  right: 2,
                  height: 5,
                  cursor: 'ns-resize',
                  background: 'rgba(0,0,0,0.18)',
                  borderRadius: '0 0 3px 3px',
                  touchAction: 'none',
                }}
              />
            )}
          </div>
        )
      })}
      {todos.map(todo => (
        <div
          key={todo.id}
          style={{
            background: 'var(--color-foam)',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            padding: '2px 5px',
            fontSize: 11,
            color: 'var(--color-text)',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {todo.title}
        </div>
      ))}
    </div>
  )
}

interface Props {
  events: CalendarEvent[]
  todos: Todo[]
  myUserId: string
  partnerUserId: string | null
  myColor: string
  partnerColor: string
  date: Date
  onNavigate: (date: Date) => void
  isDragging: boolean
  onRefresh: () => void
}

export default function WeekCalendar({
  events, todos, myUserId, partnerUserId, myColor, partnerColor,
  date, onNavigate, isDragging, onRefresh,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const updateEvent = useEventStore(s => s.updateEvent)

  // ── Event drag-to-move ──
  const dragEventDataRef = useRef<{ eventId: string; durationMs: number } | null>(null)
  const dragTargetRef = useRef<{ date: string; hour: number } | null>(null)
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null)
  const [dragHighlight, setDragHighlight] = useState<{ date: string; hour: number } | null>(null)

  // ── Event resize ──
  const resizeDataRef = useRef<{
    eventId: string
    originalEndMs: number
    originalStartMs: number
    startY: number
  } | null>(null)
  const resizePreviewRef = useRef<{ eventId: string; endTime: Date } | null>(null)
  const [resizePreviewEnd, setResizePreviewEnd] = useState<{ eventId: string; endTime: Date } | null>(null)

  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR)

  const dayMap = useCalendarData(events, todos)

  const isCurrentPeriod = isSameWeek(date, new Date(), { weekStartsOn: 1 })
  const label =
    format(weekStart, 'MMM d') + '–' +
    (weekStart.getMonth() === weekEnd.getMonth()
      ? format(weekEnd, 'd, yyyy')
      : format(weekEnd, 'MMM d, yyyy'))

  const currentHour = new Date().getHours()

  useEffect(() => {
    const scrollToHour = Math.max(START_HOUR, Math.min(END_HOUR, currentHour - 1))
    scrollRef.current
      ?.querySelector(`[data-scroll-hour="${scrollToHour}"]`)
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
      const initialCell = {
        date: format(new Date(event.start_time), 'yyyy-MM-dd'),
        hour: new Date(event.start_time).getHours(),
      }
      dragTargetRef.current = initialCell
      setDraggingEventId(event.id)
      setDragHighlight(initialCell)
    }

    function onPointerUp() {
      if (dragging) {
        const target = dragTargetRef.current
        const data = dragEventDataRef.current
        if (target && data) {
          const h = String(target.hour).padStart(2, '0')
          const newStart = new Date(`${target.date}T${h}:00:00`)
          const newEnd = new Date(newStart.getTime() + data.durationMs)
          updateEvent(data.eventId, {
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
          })
        }
        dragEventDataRef.current = null
        dragTargetRef.current = null
        setDraggingEventId(null)
        setDragHighlight(null)
      }
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp, { once: true })
  }

  function handleCellPointerEnter(dateKey: string, hour: number) {
    if (dragEventDataRef.current) {
      dragTargetRef.current = { date: dateKey, hour }
      setDragHighlight({ date: dateKey, hour })
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
      // ROW_HEIGHT px = 60 min → deltaY / ROW_HEIGHT * 60 = delta minutes
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
    <div className="flex flex-col h-full overflow-hidden">
      <CalendarNav
        label={label}
        onPrev={() => onNavigate(subWeeks(date, 1))}
        onNext={() => onNavigate(addWeeks(date, 1))}
        onToday={() => onNavigate(new Date())}
        showTodayButton={!isCurrentPeriod}
        onNewEvent={() => setShowForm(true)}
        myColor={myColor}
        partnerColor={partnerUserId ? partnerColor : null}
      />

      {showForm && (
        <NewEventForm
          userId={myUserId}
          onSave={() => { setShowForm(false); onRefresh() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Sticky day header row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `${GUTTER_WIDTH}px repeat(7, 1fr)`,
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <div />
          {days.map(day => {
            const today = isToday(day)
            return (
              <div
                key={day.toISOString()}
                style={{
                  padding: '5px 4px',
                  textAlign: 'center',
                  borderLeft: '1px solid var(--color-border)',
                  background: today ? 'rgba(0,181,200,0.05)' : 'transparent',
                }}
              >
                <div style={{ fontSize: 10, color: today ? 'var(--color-primary)' : 'var(--color-text-disabled)', fontWeight: 500, letterSpacing: '0.03em' }}>
                  {format(day, 'EEE').toUpperCase()}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: today ? 700 : 400,
                    color: today ? 'var(--color-primary)' : 'var(--color-text)',
                    lineHeight: 1.2,
                  }}
                >
                  {format(day, 'd')}
                </div>
              </div>
            )
          })}
        </div>

        {/* Scrollable time body */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {hours.map(hour => {
            const isCurrentHour = isCurrentPeriod && hour === currentHour
            return (
              <div
                key={hour}
                data-scroll-hour={hour}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `${GUTTER_WIDTH}px repeat(7, 1fr)`,
                }}
              >
                {/* Hour label */}
                <div
                  style={{
                    fontSize: 11,
                    color: isCurrentHour ? 'var(--color-primary)' : 'var(--color-text-disabled)',
                    fontWeight: isCurrentHour ? 600 : 400,
                    paddingTop: 10,
                    paddingLeft: 4,
                    flexShrink: 0,
                    letterSpacing: '0.01em',
                    borderTop: `1px solid ${isCurrentHour ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    height: ROW_HEIGHT,
                    boxSizing: 'border-box',
                  }}
                >
                  {formatHour(hour)}
                </div>

                {/* One slot per day */}
                {days.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd')
                  const data = dayMap.get(dateKey)
                  const slotEvents = (data?.events ?? []).filter(
                    e => new Date(e.start_time).getHours() === hour
                  )
                  const slotTodos = (data?.todos ?? []).filter(t => {
                    if (!t.scheduled_time) return false
                    return parseInt(t.scheduled_time.split(':')[0]) === hour
                  })
                  const isTarget = dragHighlight?.date === dateKey && dragHighlight?.hour === hour

                  return (
                    <WeekSlotCell
                      key={dateKey}
                      date={dateKey}
                      hour={hour}
                      events={slotEvents}
                      todos={slotTodos}
                      isCurrentHour={isToday(day) && hour === currentHour}
                      isTodoDragging={isDragging}
                      isEventDragTarget={isTarget}
                      myColor={myColor}
                      partnerColor={partnerColor}
                      myUserId={myUserId}
                      ghostEventId={draggingEventId}
                      resizePreviewEnd={resizePreviewEnd}
                      onPointerEnter={() => handleCellPointerEnter(dateKey, hour)}
                      onEventPointerDown={(e, event) => startEventDrag(e, event)}
                      onResizePointerDown={(e, event) => startEventResize(e, event)}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}