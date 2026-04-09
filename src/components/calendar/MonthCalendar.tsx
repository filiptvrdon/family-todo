'use client'

import { useRef, useState } from 'react'
import {
  format, addMonths, subMonths, isSameMonth, isToday,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
} from 'date-fns'
import { useDroppable } from '@dnd-kit/core'
import { CalendarEvent, Todo } from '@/lib/types'
import { useCalendarData } from './useCalendarData'
import { useEventStore } from '@/stores/event-store'
import CalendarNav from './CalendarNav'
import EventChip from './EventChip'
import TodoDot from './TodoDot'
import NewEventForm from './NewEventForm'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface MonthDayCellProps {
  date: Date
  events: CalendarEvent[]
  todos: Todo[]
  isCurrentMonth: boolean
  isDraggingActive: boolean
  isEventDragTarget: boolean
  myColor: string
  partnerColor: string
  myUserId: string
  ghostEventId: string | null
  onCellPointerEnter: () => void
  onEventPointerDown: (e: React.PointerEvent, event: CalendarEvent) => void
}

function MonthDayCell({
  date, events, todos, isCurrentMonth, isDraggingActive, isEventDragTarget,
  myColor, partnerColor, myUserId, ghostEventId,
  onCellPointerEnter, onEventPointerDown,
}: MonthDayCellProps) {
  const dateKey = format(date, 'yyyy-MM-dd')
  const { setNodeRef, isOver } = useDroppable({
    id: `month-day-${dateKey}`,
    disabled: !isDraggingActive,
  })

  const today = isToday(date)

  return (
    <div
      ref={setNodeRef}
      onPointerEnter={onCellPointerEnter}
      style={{
        borderTop: '1px solid var(--color-border)',
        borderLeft: '1px solid var(--color-border)',
        padding: '5px 6px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minHeight: 80,
        background: isEventDragTarget
          ? 'rgba(0,181,200,0.12)'
          : isOver && isDraggingActive
            ? 'rgba(0,181,200,0.1)'
            : !isCurrentMonth
              ? 'rgba(0,0,0,0.015)'
              : 'transparent',
        outline: (isOver && isDraggingActive) || isEventDragTarget
          ? '1px solid var(--color-primary)'
          : 'none',
        outlineOffset: -1,
        transition: 'background 0.1s',
      }}
    >
      {/* Date number */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 1 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: today ? 600 : 400,
            color: !isCurrentMonth
              ? 'var(--color-text-disabled)'
              : today
                ? '#fff'
                : 'var(--color-text-secondary)',
            width: today ? 20 : 'auto',
            height: today ? 20 : 'auto',
            borderRadius: today ? '50%' : 0,
            background: today ? 'var(--color-primary)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {format(date, 'd')}
        </span>
      </div>

      {/* All event chips */}
      {events.map(event => (
        <div
          key={event.id}
          onPointerDown={e => onEventPointerDown(e, event)}
          style={{ cursor: ghostEventId === event.id ? 'grabbing' : 'grab', touchAction: 'none' }}
        >
          <EventChip
            event={event}
            color={event.user_id === myUserId ? myColor : partnerColor}
            isGhost={ghostEventId === event.id}
          />
        </div>
      ))}

      {/* Todo dots */}
      {todos.length > 0 && (
        <div style={{ marginTop: events.length > 0 ? 2 : 'auto' }}>
          <TodoDot count={todos.length} color={myColor} />
        </div>
      )}
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

export default function MonthCalendar({
  events, todos, myUserId, partnerUserId, myColor, partnerColor,
  date, onNavigate, isDragging, onRefresh,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const updateEvent = useEventStore(s => s.updateEvent)

  // ── Event drag-to-move (day granularity) ──
  const monthDragDataRef = useRef<{ eventId: string; durationMs: number } | null>(null)
  const monthDragTargetRef = useRef<string | null>(null)
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null)
  const [dragHighlight, setDragHighlight] = useState<string | null>(null)

  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const numWeeks = days.length / 7

  const dayMap = useCalendarData(events, todos)

  const isCurrentPeriod = isSameMonth(date, new Date())
  const label = format(date, 'MMMM yyyy')

  function startMonthEventDrag(e: React.PointerEvent, event: CalendarEvent, originalDateKey: string) {
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
      monthDragDataRef.current = { eventId: event.id, durationMs }
      monthDragTargetRef.current = originalDateKey
      setDraggingEventId(event.id)
      setDragHighlight(originalDateKey)
    }

    function onPointerUp() {
      if (dragging) {
        const target = monthDragTargetRef.current
        const data = monthDragDataRef.current
        if (target && data) {
          const originalStart = new Date(event.start_time)
          const timeStr = format(originalStart, 'HH:mm:ss')
          const newStart = new Date(`${target}T${timeStr}`)
          const newEnd = new Date(newStart.getTime() + data.durationMs)
          updateEvent(data.eventId, {
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
          })
        }
        monthDragDataRef.current = null
        monthDragTargetRef.current = null
        setDraggingEventId(null)
        setDragHighlight(null)
      }
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp, { once: true })
  }

  function handleCellPointerEnter(dateKey: string) {
    if (monthDragDataRef.current) {
      monthDragTargetRef.current = dateKey
      setDragHighlight(dateKey)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <CalendarNav
        label={label}
        onPrev={() => onNavigate(subMonths(date, 1))}
        onNext={() => onNavigate(addMonths(date, 1))}
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

      {/* Calendar grid */}
      <div className="flex-1 min-h-0 flex flex-col overflow-auto">
        {/* Day-of-week header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          {DAY_LABELS.map(day => (
            <div
              key={day}
              style={{
                padding: '4px 6px',
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--color-text-disabled)',
                textAlign: 'center',
                letterSpacing: '0.03em',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells — auto-height rows so all labels show */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gridTemplateRows: `repeat(${numWeeks}, auto)`,
            borderRight: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd')
            const data = dayMap.get(key)
            return (
              <MonthDayCell
                key={key}
                date={day}
                events={data?.events ?? []}
                todos={data?.todos ?? []}
                isCurrentMonth={isSameMonth(day, date)}
                isDraggingActive={isDragging}
                isEventDragTarget={dragHighlight === key}
                myColor={myColor}
                partnerColor={partnerColor}
                myUserId={myUserId}
                ghostEventId={draggingEventId}
                onCellPointerEnter={() => handleCellPointerEnter(key)}
                onEventPointerDown={(e, event) => startMonthEventDrag(e, event, key)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}