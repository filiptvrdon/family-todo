'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { Profile, Todo, CalendarEvent } from '@/lib/types'
import TodoColumn from '@/components/TodoColumn'
import DayTimeline from '@/components/DayTimeline'
import SharedCalendar from '@/components/SharedCalendar'

interface Props {
  profile: Profile
  partner: Profile | null
  myTodos: Todo[]
  partnerTodos: Todo[]
  allEvents: CalendarEvent[]
  myName: string
  partnerName: string
  onRefresh: () => void
  onTodoComplete: (todoId: string) => void
}

export default function DesktopLayout({
  profile, partner, myTodos, partnerTodos, allEvents,
  myName, partnerName, onRefresh, onTodoComplete,
}: Props) {
  const row2Ref = useRef<HTMLDivElement>(null)
  const [calendarHeight, setCalendarHeight] = useState(420)

  // Measure row-2 height so the calendar can fill it (minus header + form area)
  useEffect(() => {
    if (!row2Ref.current) return
    const observer = new ResizeObserver(() => {
      if (row2Ref.current) {
        // Subtract inner padding (16px top + 16px bottom) and the SharedCalendar header (~52px)
        setCalendarHeight(Math.max(300, row2Ref.current.clientHeight - 84))
      }
    })
    observer.observe(row2Ref.current)
    return () => observer.disconnect()
  }, [])

  const scheduledTodos = myTodos.filter((t) => !t.completed && !!t.scheduled_time)

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 24px 24px',
        gap: 16,
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      {/* ── Row 1: Day timeline (left) + Tasks (right) ── */}
      <div style={{ display: 'flex', gap: 16, flex: '0 0 45%', minHeight: 0 }}>

        {/* Left — Day timeline */}
        <div
          style={{
            flex: '0 0 calc(50% - 8px)',
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
            borderRadius: 16,
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 16px 8px',
              borderBottom: '1px solid var(--color-border)',
              flexShrink: 0,
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <DayTimeline
              events={allEvents}
              todos={scheduledTodos}
              onTodoComplete={onTodoComplete}
              expand
            />
          </div>
        </div>

        {/* Right — My tasks */}
        <div
          style={{
            flex: '0 0 calc(50% - 8px)',
            background: '#fff',
            borderRadius: 16,
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
            overflowY: 'auto',
            padding: 16,
            minHeight: 0,
          }}
        >
          <TodoColumn
            todos={myTodos}
            ownerName={myName}
            isOwner={true}
            userId={profile.id}
            onRefresh={onRefresh}
          />
        </div>
      </div>

      {/* ── Row 2: Full-width calendar ── */}
      <div
        ref={row2Ref}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <SharedCalendar
          events={allEvents}
          myUserId={profile.id}
          partnerUserId={partner?.id ?? null}
          myColor="var(--color-primary)"
          partnerColor="var(--color-completion)"
          onRefresh={onRefresh}
          calendarHeight={calendarHeight}
        />
      </div>
    </div>
  )
}
