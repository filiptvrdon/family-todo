'use client'

import { useState } from 'react'
import { Profile, Todo, CalendarEvent } from '@/lib/types'
import TaskBoard from '@/components/TaskBoard'
import CalendarSuite from '@/components/CalendarSuite'
import FocusMode from '@/components/FocusMode'
import { Calendar, Focus, ListTodo } from 'lucide-react'

type MainTab = 'tasks' | 'schedule' | 'focus'

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
  dayDate: Date
  setDayDate: (d: Date) => void
  weekCalDate: Date
  setWeekCalDate: (d: Date) => void
  monthCalDate: Date
  setMonthCalDate: (d: Date) => void
  isDragging: boolean
}

export default function ResponsiveDashboard(props: Props) {
  const [mobileTab, setMobileTab] = useState<MainTab>('tasks')
  const [desktopTab, setDesktopTab] = useState<'schedule' | 'focus'>('schedule')

  const {
    profile, partner, myTodos, partnerTodos, myName, partnerName, onRefresh
  } = props

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* ── Mobile Tab Bar (only < md) ── */}
      <div className="md:hidden shrink-0 flex justify-center px-4 py-2 bg-background border-b border-border">
        <div className="flex items-center rounded-lg p-1 gap-1 bg-foam">
          {(['tasks', 'schedule', 'focus'] as MainTab[]).map((t) => (
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
              {t === 'schedule' && <Calendar size={14} />}
              {t === 'focus' && <Focus size={14} />}
              <span>{t}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* ── Task Board (Left on Desktop, Tab 1 on Mobile) ── */}
        <div 
          className={`flex-1 min-w-0 md:flex-initial md:w-[400px] lg:w-[450px] md:border-r border-border bg-card flex-col ${
            mobileTab === 'tasks' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <TaskBoard 
            profile={profile}
            partner={partner}
            myTodos={myTodos}
            partnerTodos={partnerTodos}
            myName={myName}
            partnerName={partnerName}
            onRefresh={onRefresh}
          />
        </div>

        {/* ── Main Content Area (Right on Desktop, Tab 2/3 on Mobile) ── */}
        <div 
          className={`flex-1 flex flex-col min-w-0 bg-background ${
            mobileTab !== 'tasks' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {/* Desktop Detail Tabs (only ≥ md) */}
          <div className="hidden md:flex shrink-0 items-center gap-4 px-6 py-3 border-b border-border bg-card">
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
            {/* Logic to show correct component based on view-port and active tab */}
            {/* Mobile shows whatever tab is active (if not tasks) */}
            {/* Desktop shows desktopTab */}
            <div className="flex-1 flex flex-col min-h-0 md:hidden">
              {mobileTab === 'schedule' && (
                <CalendarSuite 
                  {...props}
                />
              )}
              {mobileTab === 'focus' && (
                <FocusMode 
                  myTodos={myTodos}
                  partnerTodos={partnerTodos}
                  partnerName={partnerName}
                  myUserId={profile.id}
                  onRefresh={onRefresh}
                />
              )}
            </div>

            <div className="hidden md:flex flex-1 flex-col min-h-0">
              {desktopTab === 'schedule' ? (
                <CalendarSuite 
                  {...props}
                />
              ) : (
                <FocusMode 
                  myTodos={myTodos}
                  partnerTodos={partnerTodos}
                  partnerName={partnerName}
                  myUserId={profile.id}
                  onRefresh={onRefresh}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
