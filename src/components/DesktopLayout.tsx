'use client'

import { useState } from 'react'
import { format, addDays, subDays, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Views } from 'react-big-calendar'
import { Profile, Todo, CalendarEvent } from '@/lib/types'
import TodoColumn from '@/components/TodoColumn'
import DayTimeline from '@/components/DayTimeline'
import SharedCalendar from '@/components/SharedCalendar'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, Modifier } from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'

type RightTab = 'day' | 'week' | 'month'

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
  const [rightTab, setRightTab] = useState<RightTab>('day')
  const [dayDate, setDayDate] = useState<Date>(new Date())
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

  const scheduledTodos = myTodos.filter((t) => !!t.scheduled_time)

  const tabs: { id: RightTab; label: string }[] = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', gap: 16, padding: '16px 24px 24px', overflow: 'hidden', minHeight: 0 }}>

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

      {/* Right — Tabbed panel */}
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
        {/* Tab bar */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'flex-end',
            padding: '10px 16px 0',
            borderBottom: '1px solid var(--color-border)',
            gap: 2,
          }}
        >
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setRightTab(id)}
              style={{
                padding: '5px 14px',
                borderRadius: '8px 8px 0 0',
                fontSize: 13,
                fontWeight: 500,
                border: '1px solid var(--color-border)',
                borderBottom: rightTab === id ? '1px solid #fff' : '1px solid var(--color-border)',
                background: rightTab === id ? '#fff' : 'transparent',
                color: rightTab === id ? 'var(--color-text)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'background 150ms, color 150ms',
                marginBottom: rightTab === id ? -1 : 0,
                position: 'relative',
                zIndex: rightTab === id ? 1 : 0,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Day navigation header */}
        {rightTab === 'day' && (
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setDayDate(subDays(dayDate, 1))}
              style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--color-text-secondary)' }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setDayDate(addDays(dayDate, 1))}
              style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--color-text-secondary)' }}
            >
              <ChevronRight size={14} />
            </button>
            {!isSameDay(dayDate, new Date()) && (
              <button
                onClick={() => setDayDate(new Date())}
                style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}
              >
                Today
              </button>
            )}
            <p style={{ fontSize: 13, fontWeight: 600, color: isSameDay(dayDate, new Date()) ? 'var(--color-text)' : 'var(--color-primary)', marginLeft: 4 }}>
              {format(dayDate, 'EEEE, MMMM d')}
            </p>
          </div>
        )}

        {/* Panel content */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {rightTab === 'day' && (
            <DndContext sensors={sensors} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
              <DayTimeline
                events={allEvents}
                todos={scheduledTodos}
                onTodoComplete={onTodoComplete}
                date={dayDate}
                expand
              />
            </DndContext>
          )}

          {rightTab === 'week' && (
            <div style={{ padding: 16, height: '100%', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <SharedCalendar
                events={allEvents}
                myUserId={profile.id}
                partnerUserId={partner?.id ?? null}
                myColor="var(--color-primary)"
                partnerColor="var(--color-completion)"
                onRefresh={onRefresh}
                defaultView={Views.WEEK}
              />
            </div>
          )}

          {rightTab === 'month' && (
            <div style={{ padding: 16, height: '100%', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <SharedCalendar
                events={allEvents}
                myUserId={profile.id}
                partnerUserId={partner?.id ?? null}
                myColor="var(--color-primary)"
                partnerColor="var(--color-completion)"
                onRefresh={onRefresh}
                defaultView={Views.MONTH}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
