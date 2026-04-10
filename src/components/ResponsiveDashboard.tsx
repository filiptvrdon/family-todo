'use client'

import { useState } from 'react'
import { User, Todo, CalendarEvent } from '@/lib/types'
import TaskBoard from '@/components/TaskBoard'
import CalendarSuite from '@/components/CalendarSuite'
import HabitList from '@/components/habit/HabitList'
import { Calendar, ListTodo, Repeat2 } from 'lucide-react'

type MainTab = 'tasks' | 'habits' | 'schedule'

interface Props {
  user: User
  partner: User | null
  myTodos: Todo[]
  partnerTodos: Todo[]
  allEvents: CalendarEvent[]
  myName: string
  partnerName: string
  onRefresh: () => void
  onTodoComplete: (todoId: string) => void
  dayDate: Date
  setDayDate: (d: Date) => void
  weekCalDate: Date
  setWeekCalDate: (d: Date) => void
  monthCalDate: Date
  setMonthCalDate: (d: Date) => void
  isDragging: boolean
  isSubtaskMode: boolean
}

export default function ResponsiveDashboard(props: Props) {
  const [mobileTab, setMobileTab] = useState<MainTab>('tasks')

  const { user, myTodos, onRefresh } = props

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* ── Mobile Tab Bar (only < lg) ── */}
      <div className="lg:hidden shrink-0 flex justify-center px-4 py-2 bg-background border-b border-border">
        <div className="flex items-center rounded-lg p-1 gap-1 bg-foam">
          {(['tasks', 'habits', 'schedule'] as MainTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setMobileTab(t)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition font-medium capitalize"
              style={
                mobileTab === t
                  ? { background: 'var(--card)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', color: 'var(--color-text)' }
                  : { color: 'var(--color-text-secondary)' }
              }
            >
              {t === 'tasks' && <ListTodo size={14} />}
              {t === 'habits' && <Repeat2 size={14} />}
              {t === 'schedule' && <Calendar size={14} />}
              <span>{t}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ── Habits column (desktop lg: leftmost ~33%; mobile: own tab) ── */}
        <div
          className={`lg:flex-initial lg:w-1/3 lg:border-r border-border bg-card flex-col ${
            mobileTab === 'habits' ? 'flex flex-1 min-w-0' : 'hidden lg:flex'
          }`}
        >
          <HabitList userId={user.id} />
        </div>

        {/* ── Task Board (desktop lg: center ~33%; mobile: tab 1) ── */}
        <div
          className={`lg:flex-initial lg:w-1/3 lg:border-r border-border bg-card flex-col ${
            mobileTab === 'tasks' ? 'flex flex-1 min-w-0' : 'hidden lg:flex'
          }`}
        >
          <TaskBoard
            user={user}
            myTodos={myTodos}
            onRefresh={onRefresh}
            isSubtaskMode={props.isSubtaskMode}
          />
        </div>

        {/* ── Schedule column (desktop lg: right ~30%; mobile: schedule tab) ── */}
        <div
          className={`flex-1 flex flex-col min-w-0 bg-background ${
            mobileTab === 'schedule' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <CalendarSuite {...props} dayOnly />
        </div>
      </div>
    </div>
  )
}
