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
    <div className="flex gap-4 px-6 pt-4 pb-6 overflow-hidden min-h-0 flex-1">

      {/* Left — Task list */}
      <div className="flex-1 bg-card rounded-2xl border border-border shadow-[var(--shadow-card)] overflow-y-auto p-4">
        <TodoColumn
          todos={myTodos}
          ownerName={myName}
          isOwner={true}
          userId={profile.id}
          onRefresh={onRefresh}
        />
      </div>

      {/* Right — Tabbed panel */}
      <div className="flex-1 flex flex-col bg-card rounded-2xl border border-border shadow-[var(--shadow-card)] overflow-hidden">
        {/* Tab bar — active tab uses negative margin + z-index trick to merge with border;
            these dynamic values must stay inline */}
        <div className="shrink-0 flex items-end px-4 pt-[10px] border-b border-border gap-0.5">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setRightTab(id)}
              className="text-[13px] font-medium cursor-pointer transition-[background,color] duration-150"
              style={{
                padding: '5px 14px',
                borderRadius: '8px 8px 0 0',
                border: '1px solid var(--color-border)',
                borderBottom: rightTab === id ? '1px solid var(--card)' : '1px solid var(--color-border)',
                background: rightTab === id ? 'var(--card)' : 'transparent',
                color: rightTab === id ? 'var(--color-text)' : 'var(--color-text-secondary)',
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
          <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border">
            <button
              onClick={() => setDayDate(subDays(dayDate, 1))}
              className="flex items-center border border-border rounded-md px-1.5 py-0.5 text-muted-foreground"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setDayDate(addDays(dayDate, 1))}
              className="flex items-center border border-border rounded-md px-1.5 py-0.5 text-muted-foreground"
            >
              <ChevronRight size={14} />
            </button>
            {!isSameDay(dayDate, new Date()) && (
              <button
                onClick={() => setDayDate(new Date())}
                className="text-[11px] font-medium border border-border rounded-md px-2 py-0.5 text-muted-foreground"
              >
                Today
              </button>
            )}
            {/* Date label — color depends on whether it's today */}
            <p
              className="text-[13px] font-semibold ml-1"
              style={{ color: isSameDay(dayDate, new Date()) ? 'var(--color-text)' : 'var(--color-primary)' }}
            >
              {format(dayDate, 'EEEE, MMMM d')}
            </p>
          </div>
        )}

        {/* Panel content */}
        <div className="flex-1 min-h-0 overflow-hidden">
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
            <div className="p-4 h-full overflow-hidden flex flex-col box-border">
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
            <div className="p-4 h-full overflow-hidden flex flex-col box-border">
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
