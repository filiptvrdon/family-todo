'use client'

import { useState } from 'react'
import { User, Todo, CalendarEvent } from '@/lib/types'
import TaskBoard from '@/components/TaskBoard'
import CalendarSuite from '@/components/CalendarSuite'
import FocusMode from '@/components/FocusMode'
import HabitList from '@/components/habit/HabitList'
import { Calendar, Focus, ListTodo, Repeat2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type MainTab = 'tasks' | 'habits' | 'schedule' | 'focus'

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
  const [desktopTab, setDesktopTab] = useState<'schedule' | 'focus'>('schedule')

  const {
    user, partner, myTodos, partnerTodos, myName, partnerName, onRefresh
  } = props

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* ── Mobile Tab Bar (only < lg) ── */}
      <div className="lg:hidden shrink-0 flex justify-center px-4 py-2 bg-background border-b border-border">
        <div className="flex items-center rounded-lg p-1 gap-1 bg-foam">
          {(['tasks', 'habits', 'schedule', 'focus'] as MainTab[]).map((t) => (
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
              {t === 'focus' && <Focus size={14} />}
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
            partner={partner}
            myTodos={myTodos}
            partnerTodos={partnerTodos}
            myName={myName}
            partnerName={partnerName}
            onRefresh={onRefresh}
            isSubtaskMode={props.isSubtaskMode}
          />
        </div>

        {/* ── Schedule / Focus column (desktop lg: right ~30%; mobile: tabs 3/4) ── */}
        <div
          className={`flex-1 flex flex-col min-w-0 bg-background ${
            (mobileTab === 'schedule' || mobileTab === 'focus') ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Desktop detail tabs (only ≥ lg) */}
          <div className="hidden lg:flex shrink-0 items-center gap-4 px-6 py-3 border-b border-border bg-card">
            <button
              onClick={() => setDesktopTab('schedule')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                desktopTab === 'schedule' ? 'bg-foam text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar size={16} />
              Schedule
            </button>
            <button
              onClick={() => setDesktopTab('focus')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                desktopTab === 'focus' ? 'bg-foam text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Focus size={16} />
              Focus Mode
            </button>
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Mobile: schedule / focus tabs */}
            <div className="flex-1 flex flex-col min-h-0 lg:hidden relative">
              <AnimatePresence mode="wait">
                {mobileTab === 'schedule' && (
                  <motion.div
                    key="schedule"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <CalendarSuite {...props} />
                  </motion.div>
                )}
                {mobileTab === 'focus' && (
                  <motion.div
                    key="focus"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <FocusMode
                      myTodos={myTodos}
                      partnerTodos={partnerTodos}
                      partnerName={partnerName}
                      myUserId={user.id}
                      onRefresh={onRefresh}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Desktop: desktopTab toggle */}
            <div className="hidden lg:flex flex-1 flex-col min-h-0 relative">
              <AnimatePresence mode="wait">
                {desktopTab === 'schedule' ? (
                  <motion.div
                    key="schedule"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <CalendarSuite {...props} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="focus"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <FocusMode
                      myTodos={myTodos}
                      partnerTodos={partnerTodos}
                      partnerName={partnerName}
                      myUserId={user.id}
                      onRefresh={onRefresh}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
