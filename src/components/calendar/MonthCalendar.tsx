'use client'

import { useState } from 'react'
import {
  format, addMonths, subMonths, isSameMonth, isToday,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
} from 'date-fns'
import { useDroppable } from '@dnd-kit/core'
import { CalendarEvent, Todo } from '@/lib/types'
import { useCalendarData } from './useCalendarData'
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
  myColor: string
  partnerColor: string
  myUserId: string
}

function MonthDayCell({
  date, events, todos, isCurrentMonth, isDraggingActive, myColor, partnerColor, myUserId,
}: MonthDayCellProps) {
  const dateKey = format(date, 'yyyy-MM-dd')
  const { setNodeRef, isOver } = useDroppable({
    id: `month-day-${dateKey}`,
    disabled: !isDraggingActive,
  })

  const today = isToday(date)
  const visibleEvents = events.slice(0, 2)
  const overflowCount = events.length + todos.length - visibleEvents.length
  const hasTodoDots = todos.length > 0 && events.length < 2

  return (
    <div
      ref={setNodeRef}
      style={{
        borderTop: '1px solid var(--color-border)',
        borderLeft: '1px solid var(--color-border)',
        padding: '5px 6px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minHeight: 72,
        background: isOver && isDraggingActive
          ? 'rgba(0,181,200,0.1)'
          : !isCurrentMonth
            ? 'rgba(0,0,0,0.015)'
            : 'transparent',
        outline: isOver && isDraggingActive ? '1px solid var(--color-primary)' : 'none',
        outlineOffset: -1,
        transition: 'background 0.1s',
        overflow: 'hidden',
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

      {/* Event chips (max 2) */}
      {visibleEvents.map(event => (
        <EventChip
          key={event.id}
          event={event}
          color={event.user_id === myUserId ? myColor : partnerColor}
        />
      ))}

      {/* Overflow count */}
      {overflowCount > 0 && (
        <span style={{ fontSize: 10, color: 'var(--color-text-disabled)', lineHeight: 1 }}>
          +{overflowCount} more
        </span>
      )}

      {/* Todo dots when events don't fill slots */}
      {hasTodoDots && (
        <div style={{ marginTop: 'auto' }}>
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

  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const numWeeks = days.length / 7

  const dayMap = useCalendarData(events, todos)

  const isCurrentPeriod = isSameMonth(date, new Date())
  const label = format(date, 'MMMM yyyy')

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
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Day-of-week header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderBottom: '1px solid var(--color-border)',
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

        {/* Day cells */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gridTemplateRows: `repeat(${numWeeks}, 1fr)`,
            borderRight: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
            minHeight: 0,
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
                myColor={myColor}
                partnerColor={partnerColor}
                myUserId={myUserId}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
