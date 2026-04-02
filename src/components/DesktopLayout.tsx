'use client'

import { useId, useState } from 'react'
import { format, addDays, subDays, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Profile, Todo, CalendarEvent } from '@/lib/types'
import { generateKeyBetween } from 'fractional-indexing'
import TodoList from '@/components/TodoList'
import DayTimeline from '@/components/DayTimeline'
import WeekCalendar from '@/components/calendar/WeekCalendar'
import MonthCalendar from '@/components/calendar/MonthCalendar'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
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
  const [weekCalDate, setWeekCalDate] = useState<Date>(new Date())
  const [monthCalDate, setMonthCalDate] = useState<Date>(new Date())
  const [draggingTodoId, setDraggingTodoId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragStart(event: DragStartEvent) {
    if (event.active.data.current?.source === 'todo-column') {
      setDraggingTodoId(event.active.id as string)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setDraggingTodoId(null)
    const supabase = createClient()

    // Reordering within the list
    const oldIndex = myTodos.findIndex(t => t.id === active.id)
    const newIndex = myTodos.findIndex(t => t.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = [...myTodos]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)

      const before = newIndex > 0 ? (reordered[newIndex - 1].index || null) : null
      const after = newIndex < reordered.length - 1 ? (reordered[newIndex + 1].index || null) : null
      const computedIndex = generateKeyBetween(before, after)

      await supabase.from('todos').update({ index: computedIndex }).eq('id', active.id)
      onRefresh()
      return
    }

    if (!over) return

    const todoId = active.id as string
    const isFromColumn = active.data.current?.source === 'todo-column'

    // Day view: hour slot
    const hourMatch = String(over.id).match(/^hour-(\d+)$/)
    if (hourMatch) {
      const hour = parseInt(hourMatch[1])
      const scheduledTime = `${String(hour).padStart(2, '0')}:00:00`
      const updates: Record<string, string> = { scheduled_time: scheduledTime }
      if (isFromColumn) updates.due_date = format(dayDate, 'yyyy-MM-dd')
      await supabase.from('todos').update(updates).eq('id', todoId)
      onRefresh()
      return
    }

    // Week view: hour slot with date
    const weekSlotMatch = String(over.id).match(/^week-slot-(\d{4}-\d{2}-\d{2})-(\d{2})$/)
    if (weekSlotMatch) {
      await supabase.from('todos').update({
        due_date: weekSlotMatch[1],
        scheduled_time: `${weekSlotMatch[2]}:00:00`,
      }).eq('id', todoId)
      onRefresh()
      return
    }

    // Month view: day cell
    const monthDayMatch = String(over.id).match(/^month-day-(\d{4}-\d{2}-\d{2})$/)
    if (monthDayMatch) {
      await supabase.from('todos').update({ due_date: monthDayMatch[1] }).eq('id', todoId)
      onRefresh()
      return
    }

    // Drop onto another todo to make it a sub-task
    if (over.data.current?.type === 'todo-drop-target') {
      const parentId = over.data.current.todoId
      if (parentId === todoId) return // Cannot drop onto itself

      // Get existing sub-tasks of the target to compute index
      const { data: existingSubTasks } = await supabase
        .from('todos')
        .select('index')
        .eq('parent_id', parentId)
        .order('index', { ascending: true })

      const lastIndex = existingSubTasks && existingSubTasks.length > 0
        ? (existingSubTasks[existingSubTasks.length - 1].index || null)
        : null
      const newIndex = generateKeyBetween(lastIndex, null)

      await supabase.from('todos').update({
        parent_id: parentId,
        index: newIndex,
        due_date: null,
        scheduled_time: null,
      }).eq('id', todoId)

      onRefresh()
      return
    }
  }

  const draggingTodo = draggingTodoId ? myTodos.find(t => t.id === draggingTodoId) ?? null : null

  // Show scheduled todos for the currently viewed day only.
  // Todos without due_date (legacy) show in all day views.
  const dayKey = format(dayDate, 'yyyy-MM-dd')
  const scheduledTodos = myTodos.filter((t) => {
    if (!t.scheduled_time) return false
    if (!t.due_date) return true
    return t.due_date === dayKey
  })

  const tabs: { id: RightTab; label: string }[] = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
  ]

  const dndContextId = useId()

  return (
    <DndContext id={dndContextId} sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <DragOverlay dropAnimation={null}>
        {draggingTodo && (
          <div
            className="rounded-xl px-3 py-2 flex items-center bg-card border shadow-lg pointer-events-none"
            style={{ borderColor: 'var(--color-primary)', minWidth: 160, maxWidth: 260 }}
          >
            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
              {draggingTodo.title}
            </p>
          </div>
        )}
      </DragOverlay>

      <div className="flex gap-4 px-6 pt-4 pb-6 overflow-hidden min-h-0 flex-1">

        {/* Left — Task list */}
        <div className="flex-1 bg-card rounded-2xl border border-border shadow-[var(--shadow-card)] overflow-y-auto p-4">
          <TodoList
            todos={myTodos}
            ownerName={myName}
            isOwner={true}
            userId={profile.id}
            parentId={null}
            onRefresh={onRefresh}
            useInternalDndContext={false}
          />
        </div>

        {/* Right — Tabbed panel */}
        <div className="flex-1 flex flex-col bg-card rounded-2xl border border-border shadow-[var(--shadow-card)] overflow-hidden">
          {/* Tab bar */}
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
              <p
                className="text-[13px] font-semibold ml-1"
                style={{ color: isSameDay(dayDate, new Date()) ? 'var(--color-text)' : 'var(--color-primary)' }}
              >
                {format(dayDate, 'EEEE, MMMM d')}
              </p>
            </div>
          )}

          {/* Panel content */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {rightTab === 'day' && (
              <DayTimeline
                events={allEvents}
                todos={scheduledTodos}
                onTodoComplete={onTodoComplete}
                date={dayDate}
                expand
              />
            )}

            {rightTab === 'week' && (
              <div className="p-4 h-full overflow-hidden flex flex-col box-border">
                <WeekCalendar
                  events={allEvents}
                  todos={myTodos}
                  myUserId={profile.id}
                  partnerUserId={partner?.id ?? null}
                  myColor="var(--color-primary)"
                  partnerColor="var(--color-completion)"
                  date={weekCalDate}
                  onNavigate={setWeekCalDate}
                  isDragging={!!draggingTodoId}
                  onRefresh={onRefresh}
                />
              </div>
            )}

            {rightTab === 'month' && (
              <div className="p-4 h-full overflow-hidden flex flex-col box-border">
                <MonthCalendar
                  events={allEvents}
                  todos={myTodos}
                  myUserId={profile.id}
                  partnerUserId={partner?.id ?? null}
                  myColor="var(--color-primary)"
                  partnerColor="var(--color-completion)"
                  date={monthCalDate}
                  onNavigate={setMonthCalDate}
                  isDragging={!!draggingTodoId}
                  onRefresh={onRefresh}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </DndContext>
  )
}
