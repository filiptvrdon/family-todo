'use client'

import { useEffect, useRef, useState } from 'react'
import {
  format, addWeeks, subWeeks, startOfWeek, endOfWeek,
  eachDayOfInterval, isToday, isSameWeek,
} from 'date-fns'
import { useDroppable } from '@dnd-kit/core'
import { CalendarEvent, Todo } from '@/lib/types'
import { useCalendarData } from './useCalendarData'
import CalendarNav from './CalendarNav'
import EventChip from './EventChip'
import NewEventForm from './NewEventForm'

const START_HOUR = 5
const END_HOUR = 20
const GUTTER_WIDTH = 52  // px — matches DayTimeline

function formatHour(h: number): string {
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

interface SlotCellProps {
  date: string       // YYYY-MM-DD
  hour: number
  events: CalendarEvent[]
  todos: Todo[]
  isCurrentHour: boolean
  isDraggingActive: boolean
  myColor: string
  partnerColor: string
  myUserId: string
}

function WeekSlotCell({
  date, hour, events, todos, isCurrentHour, isDraggingActive, myColor, partnerColor, myUserId,
}: SlotCellProps) {
  const id = `week-slot-${date}-${String(hour).padStart(2, '0')}`
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !isDraggingActive })

  const hasItems = events.length > 0 || todos.length > 0

  return (
    <div
      ref={setNodeRef}
      data-hour={hour}
      style={{
        borderTop: `1px solid ${isOver && isDraggingActive ? 'var(--color-primary)' : isCurrentHour ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderLeft: '1px solid var(--color-border)',
        minHeight: 44,
        padding: hasItems ? '4px 5px' : '0 5px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        background: isOver && isDraggingActive
          ? 'rgba(0,181,200,0.12)'
          : isCurrentHour
            ? 'rgba(0,181,200,0.04)'
            : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      {events.map(event => (
        <EventChip
          key={event.id}
          event={event}
          color={event.user_id === myUserId ? myColor : partnerColor}
          showTime
        />
      ))}
      {todos.map(todo => (
        <div
          key={todo.id}
          style={{
            background: 'var(--color-foam)',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: 12,
            color: 'var(--color-text)',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
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

  // Scroll to current hour on mount
  useEffect(() => {
    const scrollToHour = Math.max(START_HOUR, Math.min(END_HOUR, currentHour - 1))
    scrollRef.current
      ?.querySelector(`[data-scroll-hour="${scrollToHour}"]`)
      ?.scrollIntoView({ block: 'start' })
  }, [currentHour])

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

      {/* Grid container */}
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
          {/* Gutter corner */}
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

                  return (
                    <WeekSlotCell
                      key={dateKey}
                      date={dateKey}
                      hour={hour}
                      events={slotEvents}
                      todos={slotTodos}
                      isCurrentHour={isToday(day) && hour === currentHour}
                      isDraggingActive={isDragging}
                      myColor={myColor}
                      partnerColor={partnerColor}
                      myUserId={myUserId}
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
