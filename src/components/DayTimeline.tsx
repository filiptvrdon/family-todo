'use client'

import { useEffect, useRef } from 'react'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { CalendarEvent, Todo } from '@/lib/types'
import { format } from 'date-fns'
import { Check, GripVertical } from 'lucide-react'

const START_HOUR = 5
const END_HOUR = 20

function formatHour(h: number): string {
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

interface HourRowProps {
  hour: number
  isCurrent: boolean
  events: CalendarEvent[]
  todos: Todo[]
  onTodoComplete: (todoId: string) => void
}

function DraggableTimelineTodo({ todo, onComplete }: { todo: Todo; onComplete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: todo.id, disabled: todo.completed })
  return (
    <div
      ref={setNodeRef}
      style={{
        background: todo.completed ? 'transparent' : 'var(--color-foam)',
        border: `1px solid ${todo.completed ? 'transparent' : 'var(--color-border)'}`,
        borderRadius: 6,
        padding: '5px 8px',
        fontSize: 13,
        color: todo.completed ? 'var(--color-text-disabled)' : 'var(--color-text)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        overflow: 'hidden',
        opacity: isDragging ? 0.4 : todo.completed ? 0.6 : 1,
        transform: CSS.Translate.toString(transform),
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
      <span style={{ flex: 1, wordBreak: 'break-word', textDecoration: todo.completed ? 'line-through' : 'none' }}>
        {todo.title}
      </span>
      {!todo.completed && (
        <button
          {...listeners}
          {...attributes}
          style={{
            flexShrink: 0,
            cursor: 'grab',
            color: 'var(--color-text-disabled)',
            display: 'flex',
            alignItems: 'center',
            touchAction: 'none',
          }}
        >
          <GripVertical size={12} />
        </button>
      )}
    </div>
  )
}

function HourRow({ hour, isCurrent, events, todos, onTodoComplete }: HourRowProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `hour-${hour}` })
  const hasItems = events.length > 0 || todos.length > 0

  return (
    <div
      ref={setNodeRef}
      data-hour={hour}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        minHeight: 40,
        background: isOver
          ? 'rgba(0,181,200,0.1)'
          : isCurrent
            ? 'rgba(0,181,200,0.05)'
            : 'transparent',
        borderRadius: isOver ? 6 : 0,
        transition: 'background 0.15s',
      }}
    >
      <span
        style={{
          width: 52,
          fontSize: 12,
          fontWeight: isCurrent ? 600 : 400,
          color: isCurrent ? 'var(--color-primary)' : 'var(--color-text-disabled)',
          paddingTop: 10,
          flexShrink: 0,
          letterSpacing: '0.01em',
        }}
      >
        {formatHour(hour)}
      </span>

      <div
        style={{
          flex: 1,
          borderTop: `1px solid ${isOver ? 'var(--color-primary)' : isCurrent ? 'var(--color-primary)' : 'var(--color-border)'}`,
          marginTop: 10,
          paddingTop: hasItems ? 5 : 0,
          paddingBottom: hasItems ? 7 : 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {events.map((e) => (
          <div
            key={e.id}
            style={{
              background: 'var(--color-primary)',
              borderRadius: 6,
              padding: '5px 8px',
              fontSize: 13,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              overflow: 'hidden',
            }}
          >
            <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.title}
            </span>
            <span style={{ opacity: 0.75, flexShrink: 0, fontSize: 11 }}>
              {format(new Date(e.start_time), 'h:mm')}–{format(new Date(e.end_time), 'h:mma')}
            </span>
          </div>
        ))}

        {todos.map((t) => (
          <DraggableTimelineTodo key={t.id} todo={t} onComplete={onTodoComplete} />
        ))}
      </div>
    </div>
  )
}

interface Props {
  events: CalendarEvent[]
  todos: Todo[]
  onTodoComplete: (todoId: string) => void
  expand?: boolean
  date?: Date
}

export default function DayTimeline({ events, todos, onTodoComplete, expand = false, date = new Date() }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dateKey = format(date, 'yyyy-MM-dd')
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const currentHour = new Date().getHours()
  const isToday = dateKey === todayKey

  const todayEvents = events.filter((e) => format(new Date(e.start_time), 'yyyy-MM-dd') === dateKey)
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR)

  useEffect(() => {
    const scrollToHour = Math.max(START_HOUR, Math.min(END_HOUR, currentHour - 1))
    containerRef.current
      ?.querySelector(`[data-hour="${scrollToHour}"]`)
      ?.scrollIntoView({ block: 'start' })
  }, [currentHour])

  return (
    <div ref={containerRef} style={{ overflowY: 'auto', padding: '0 12px', ...(expand ? { flex: 1 } : { height: 192 }) }}>
      {hours.map((hour) => {
        const hourEvents = todayEvents.filter((e) => new Date(e.start_time).getHours() === hour)
        const hourTodos = todos.filter((t) => t.scheduled_time && parseInt(t.scheduled_time.split(':')[0]) === hour && (!t.completed || t.due_date === dateKey))

        return (
          <HourRow
            key={hour}
            hour={hour}
            isCurrent={isToday && hour === currentHour}
            events={hourEvents}
            todos={hourTodos}
            onTodoComplete={onTodoComplete}
          />
        )
      })}
    </div>
  )
}
