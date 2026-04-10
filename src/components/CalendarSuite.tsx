'use client'

import { useState } from 'react'
import { format, addDays, subDays, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { User, Todo, CalendarEvent } from '@/lib/types'
import DayTimeline from '@/components/DayTimeline'
import WeekCalendar from '@/components/calendar/WeekCalendar'
import MonthCalendar from '@/components/calendar/MonthCalendar'
import { motion, AnimatePresence } from 'framer-motion'

type CalendarTab = 'day' | 'week' | 'month'

interface Props {
  user: User
  partner: User | null
  myTodos: Todo[]
  allEvents: CalendarEvent[]
  onRefresh: () => void
  onTodoComplete: (todoId: string) => void
  dayDate: Date
  setDayDate: (d: Date) => void
  weekCalDate: Date
  setWeekCalDate: (d: Date) => void
  monthCalDate: Date
  setMonthCalDate: (d: Date) => void
  isDragging: boolean
  dayOnly?: boolean
}

export default function CalendarSuite({
  user, partner, myTodos, allEvents, onRefresh, onTodoComplete,
  dayDate, setDayDate, weekCalDate, setWeekCalDate, monthCalDate, setMonthCalDate, isDragging, dayOnly
}: Props) {
  const [tab, setTab] = useState<CalendarTab>('day')
  const activeTab = dayOnly ? 'day' : tab

  const dayKey = format(dayDate, 'yyyy-MM-dd')
  const scheduledTodos = myTodos.filter((t) => {
    if (!t.scheduled_time) return false
    if (!t.due_date) return true
    return t.due_date === dayKey
  })

  const tabs: { id: CalendarTab; label: string }[] = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
  ]

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Tab bar */}
      {!dayOnly && (
        <div className="shrink-0 flex items-end px-4 pt-[10px] border-b border-border gap-0.5 bg-card">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="text-[13px] font-medium cursor-pointer transition-[background,color] duration-150"
              style={{
                padding: '5px 14px',
                borderRadius: '8px 8px 0 0',
                border: '1px solid var(--color-border)',
                borderBottom: tab === id ? '1px solid var(--card)' : '1px solid var(--color-border)',
                background: tab === id ? 'var(--card)' : 'transparent',
                color: tab === id ? 'var(--color-text)' : 'var(--color-text-secondary)',
                marginBottom: tab === id ? -1 : 0,
                position: 'relative',
                zIndex: tab === id ? 1 : 0,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Day navigation header */}
      {activeTab === 'day' && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border bg-card">
          <button
            onClick={() => setDayDate(subDays(dayDate, 1))}
            className="flex items-center border border-border rounded-md px-1.5 py-0.5 text-muted-foreground hover:bg-foam"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setDayDate(addDays(dayDate, 1))}
            className="flex items-center border border-border rounded-md px-1.5 py-0.5 text-muted-foreground hover:bg-foam"
          >
            <ChevronRight size={14} />
          </button>
          {!isSameDay(dayDate, new Date()) && (
            <button
              onClick={() => setDayDate(new Date())}
              className="text-[11px] font-medium border border-border rounded-md px-2 py-0.5 text-muted-foreground hover:bg-foam"
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
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
        <AnimatePresence mode="wait">
          {activeTab === 'day' && (
            <motion.div
              key="day"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              <DayTimeline
                events={allEvents}
                todos={scheduledTodos}
                onTodoComplete={onTodoComplete}
                date={dayDate}
                expand
              />
            </motion.div>
          )}

          {activeTab === 'week' && (
            <motion.div
              key="week"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex-1 flex flex-col min-h-0 p-4 overflow-hidden box-border"
            >
              <WeekCalendar
                events={allEvents}
                todos={myTodos}
                myUserId={user.id}
                partnerUserId={partner?.id ?? null}
                myColor="var(--color-primary)"
                partnerColor="var(--color-completion)"
                date={weekCalDate}
                onNavigate={setWeekCalDate}
                isDragging={isDragging}
                onRefresh={onRefresh}
              />
            </motion.div>
          )}

          {activeTab === 'month' && (
            <motion.div
              key="month"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex-1 flex flex-col min-h-0 p-4 overflow-hidden box-border"
            >
              <MonthCalendar
                events={allEvents}
                todos={myTodos}
                myUserId={user.id}
                partnerUserId={partner?.id ?? null}
                myColor="var(--color-primary)"
                partnerColor="var(--color-completion)"
                date={monthCalDate}
                onNavigate={setMonthCalDate}
                isDragging={isDragging}
                onRefresh={onRefresh}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
