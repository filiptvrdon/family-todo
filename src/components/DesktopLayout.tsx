'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { LayoutDashboard, CalendarDays } from 'lucide-react'
import { Profile, Todo, CalendarEvent } from '@/lib/types'
import TodoColumn from '@/components/TodoColumn'
import DayTimeline from '@/components/DayTimeline'
import SharedCalendar from '@/components/SharedCalendar'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, Modifier } from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'

type View = 'dashboard' | 'calendar'

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
  profile, partner, myTodos, allEvents, myName, onRefresh, onTodoComplete,
}: Props) {
  const [view, setView] = useState<View>('dashboard')
  const calendarContainerRef = useRef<HTMLDivElement>(null)
  const [calendarHeight, setCalendarHeight] = useState(500)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const restrictToVerticalAxis: Modifier = ({ transform }) => ({
    ...transform,
    x: 0,
  })

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const todoId = active.id as string
    const hourMatch = String(over.id).match(/^hour-(\d+)$/)
    if (!hourMatch) return
    const hour = parseInt(hourMatch[1])
    const scheduledTime = `${String(hour).padStart(2, '0')}:00:00`
    const supabase = createClient()
    await supabase.from('todos').update({ scheduled_time: scheduledTime }).eq('id', todoId)
    onRefresh()
  }

  useEffect(() => {
    if (!calendarContainerRef.current) return
    const observer = new ResizeObserver(() => {
      if (calendarContainerRef.current) {
        setCalendarHeight(Math.max(300, calendarContainerRef.current.clientHeight - 84))
      }
    })
    observer.observe(calendarContainerRef.current)
    return () => observer.disconnect()
  }, [view])

  const scheduledTodos = myTodos.filter((t) => !!t.scheduled_time)

  const navItems: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
    { id: 'calendar', label: 'Calendar', icon: <CalendarDays size={15} /> },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

      {/* ── View switcher ── */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          gap: 4,
          padding: '10px 24px 0',
        }}
      >
        {navItems.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: '8px 8px 0 0',
              fontSize: 13,
              fontWeight: 500,
              border: '1px solid var(--color-border)',
              borderBottom: view === id ? '1px solid #fff' : '1px solid var(--color-border)',
              background: view === id ? '#fff' : 'transparent',
              color: view === id ? 'var(--color-text)' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'background 150ms, color 150ms',
              marginBottom: view === id ? -1 : 0,
              position: 'relative',
              zIndex: view === id ? 1 : 0,
            }}
          >
            {icon}
            {label}
          </button>
        ))}
        <div style={{ flex: 1, borderBottom: '1px solid var(--color-border)' }} />
      </div>

      {/* ── Dashboard view: task list (left) + day timeline (right) ── */}
      {view === 'dashboard' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: 16,
            padding: '16px 24px 24px',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {/* Left — Task list */}
          <div
            style={{
              flex: 1,
              background: '#fff',
              borderRadius: 16,
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)',
              overflowY: 'auto',
              padding: 16,
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

          {/* Right — Day timeline */}
          <div
            style={{
              flex: 1,
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
              <DndContext sensors={sensors} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
                <DayTimeline
                  events={allEvents}
                  todos={scheduledTodos}
                  onTodoComplete={onTodoComplete}
                  expand
                />
              </DndContext>
            </div>
          </div>
        </div>
      )}

      {/* ── Calendar view: calendar (66%) + task list (33%) ── */}
      {view === 'calendar' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: 16,
            padding: '16px 24px 24px',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {/* Left 66% — Calendar */}
          <div
            ref={calendarContainerRef}
            style={{
              flex: '0 0 calc(66.666% - 8px)',
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

          {/* Right 33% — Task list */}
          <div
            style={{
              flex: 1,
              background: '#fff',
              borderRadius: 16,
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)',
              overflowY: 'auto',
              padding: 16,
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
      )}
    </div>
  )
}
