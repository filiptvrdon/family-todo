'use client'

import { useState, useCallback, useEffect, useId, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useStoreInit } from '@/hooks/useStoreInit'
import { useTodoStore } from '@/stores/todo-store'
import { useUserStore } from '@/stores/user-store'
import { useEventStore } from '@/stores/event-store'
import { User, Todo, CalendarEvent } from '@/lib/types'
import CheckIn, { hasCheckedInToday } from '@/components/CheckIn'
import UserModal from '@/components/UserModal'
import QuestPanel from '@/components/QuestPanel'
import ResponsiveDashboard from '@/components/ResponsiveDashboard'
import CalendarSuite from '@/components/CalendarSuite'
import { UserCircle, Moon, Sun, Swords, Home, Calendar } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { useTheme } from '@/lib/hooks/useTheme'
import { subtaskCollisionDetection } from '@/lib/dnd-utils'
import { useSubtaskMode } from '@/hooks/useSubtaskMode'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { format } from 'date-fns'
import { generateKeyBetween } from 'fractional-indexing'

interface Props {
  user: User
  partner: User | null
  myTodos: Todo[]
  partnerTodos: Todo[]
  allEvents: CalendarEvent[]
  googleConnected: boolean
}

export default function Dashboard({ user: initialUser, partner: initialPartner, allEvents, googleConnected }: Props) {
  const user = useUserStore(s => s.user || initialUser)
  const partner = useUserStore(s => s.partner || initialPartner)
  const { isSubtaskMode } = useSubtaskMode()

  useStoreInit({ user })
  const myTodos = useTodoStore(s => s.myTodos)
  const partnerTodos = useTodoStore(s => s.partnerTodos)
  const updateTodoStore = useTodoStore(s => s.updateTodo)
  const eventsFromStore = useEventStore(s => s.events)
  
  const [dayDate, setDayDate] = useState<Date>(new Date())
  const [weekCalDate, setWeekCalDate] = useState<Date>(new Date())
  const [monthCalDate, setMonthCalDate] = useState<Date>(new Date())
  const [draggingTodoId, setDraggingTodoId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const dndContextId = useId()

  const collisionDetection = useCallback((args: Parameters<typeof subtaskCollisionDetection>[0]) => {
    return subtaskCollisionDetection(args, isSubtaskMode)
  }, [isSubtaskMode])

  const [showCheckin, setShowCheckin] = useState(() => {
    if (typeof window !== 'undefined') return !hasCheckedInToday()
    return false
  })
  const [showProfile, setShowProfile] = useState(false)
  const [showQuests, setShowQuests] = useState(false)
  const [questPanelInitialId, setQuestPanelInitialId] = useState<string | null>(null)
  const [topView, setTopView] = useState<'dashboard' | 'calendar'>('dashboard')

  const { isDark, toggle: toggleTheme } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  const refresh = useCallback(() => router.refresh(), [router])

  const onRefresh = useCallback(() => {
    // No-op for now as stores are live, but keeping for compatibility if needed
    // refresh() // Removed router.refresh() as per spec
  }, [])

  const refreshPinnedQuests = useCallback(async () => {
    // Stores update live
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (event.active.data.current?.source === 'todo-column') {
      setDraggingTodoId(event.active.id as string)
    }
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setDraggingTodoId(null)

    if (!over) return

    const todoId = active.id as string
    const isFromColumn = active.data.current?.source === 'todo-column'

    // Day view: hour slot
    const hourMatch = String(over.id).match(/^hour-(\d+)$/)
    if (hourMatch) {
      const hour = parseInt(hourMatch[1])
      const scheduledTime = `${String(hour).padStart(2, '0')}:00:00`
      const updates: Partial<Todo> = { scheduled_time: scheduledTime }
      if (isFromColumn) updates.due_date = format(dayDate, 'yyyy-MM-dd')
      updateTodoStore(todoId, updates)
      return
    }

    // Week view: hour slot with date
    const weekSlotMatch = String(over.id).match(/^week-slot-(\d{4}-\d{2}-\d{2})-(\d{2})$/)
    if (weekSlotMatch) {
      updateTodoStore(todoId, {
        due_date: weekSlotMatch[1],
        scheduled_time: `${weekSlotMatch[2]}:00:00`,
      })
      return
    }

    // Month view: day cell
    const monthDayMatch = String(over.id).match(/^month-day-(\d{4}-\d{2}-\d{2})$/)
    if (monthDayMatch) {
      updateTodoStore(todoId, { due_date: monthDayMatch[1] })
      return
    }

    // Drop onto another todo to make it a sub-task
    if (over.data.current?.type === 'todo-drop-target' && isSubtaskMode) {
      const parentId = over.data.current.todoId
      if (parentId === todoId) return // Cannot drop onto itself

      // If we are also over a sortable item that is NOT the drop target,
      // and our custom collision detection says we should prioritize reordering,
      // then we should skip this subtask logic.
      // However, the custom collision detection already handled the priority.
      // So if 'over' is the drop target, it means the custom detection DECIDED it should be.
      
      // Get existing sub-tasks of the target to compute index
      const targetIsMine = myTodos.some(t => t.id === parentId)
      const targetList = targetIsMine ? myTodos : partnerTodos
      const existingSubTasks = targetList.filter(t => t.parent_id === parentId)
        .sort((a, b) => (a.index || '') < (b.index || '') ? -1 : (a.index || '') > (b.index || '') ? 1 : 0)

      const lastIndex = existingSubTasks.length > 0
        ? (existingSubTasks[existingSubTasks.length - 1].index || null)
        : null
      const newIndex = generateKeyBetween(lastIndex, null)

      await updateTodoStore(todoId, {
        parent_id: parentId,
        index: newIndex,
        due_date: null,
        scheduled_time: null,
      })
      return
    }
  }, [dayDate, myTodos, partnerTodos, updateTodoStore, isSubtaskMode])

  const completeTodo = useCallback(async (todoId: string) => {
    useTodoStore.getState().toggleTodo(todoId, true)
  }, [])

  useEffect(() => {
    // Check-in logic is now handled in initial state
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const myName = user?.display_name || user?.email?.split('@')[0] || 'You'
  const partnerName = partner?.display_name || partner?.email?.split('@')[0] || 'Partner'

  const draggingTodo = draggingTodoId ? myTodos.find(t => t.id === draggingTodoId) ?? null : null

  // Combine store events with initial allEvents (which includes Google Calendar events)
  // Store events handle Supabase Realtime updates. 
  // Initial allEvents are needed for the first render and for Google Calendar data.
  const allEventsCombined = useMemo(() => {
    if (eventsFromStore.length === 0) return allEvents
    return eventsFromStore
  }, [eventsFromStore, allEvents])

  const sharedProps = {
    user,
    partner,
    myTodos: myTodos.filter(t => !t.parent_id),
    partnerTodos: partnerTodos.filter(t => !t.parent_id),
    allEvents: allEventsCombined,
    myName,
    partnerName,
    onRefresh,
    dayDate,
    setDayDate,
    weekCalDate,
    setWeekCalDate,
    monthCalDate,
    setMonthCalDate,
    isDragging: !!draggingTodoId,
    isSubtaskMode,
  }

  return (
    <DndContext id={dndContextId} sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
        {/* ── Header ── */}
        <header className="shrink-0 bg-card border-b border-border shadow-[var(--shadow-card)]">
          <div className="layout-container py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Logo size={24} />
              <span className="font-semibold text-foreground">Momentum</span>
            </div>

            {/* Top nav */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTopView('dashboard')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition"
                style={topView === 'dashboard'
                  ? { background: 'var(--color-foam)', color: 'var(--color-primary)' }
                  : { color: 'var(--color-text-secondary)' }}
              >
                <Home size={14} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setTopView('calendar')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition"
                style={topView === 'calendar'
                  ? { background: 'var(--color-foam)', color: 'var(--color-primary)' }
                  : { color: 'var(--color-text-secondary)' }}
              >
                <Calendar size={14} />
                <span>Calendar</span>
              </button>
              <button
                onClick={() => { setQuestPanelInitialId(null); setShowQuests(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition"
                style={{ color: showQuests ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
              >
                <Swords size={14} />
                <span>Quests</span>
              </button>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-foam/50 border border-foam">
                <span className="text-xs font-bold text-foreground">{user.momentum || 0}</span>
                {user.momentum - user.day_start_momentum > 0 && <span className="text-[10px]" style={{ color: 'var(--color-completion)' }}>↑</span>}
                {user.momentum - user.day_start_momentum < 0 && <span className="text-[10px]" style={{ color: 'var(--color-alert)' }}>↓</span>}
              </div>
              <button
                onClick={toggleTheme}
                className="transition hover:opacity-80 text-muted-foreground"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                onClick={() => setShowProfile(true)}
                className="transition hover:opacity-80"
                title="Your settings"
              >
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar_url}
                    alt="User"
                    className="rounded-full object-cover size-7 border-2 border-foam"
                  />
                ) : (
                  <UserCircle size={24} className="text-text-disabled" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* ── Main content ── */}
        {topView === 'calendar' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CalendarSuite
              user={user}
              partner={partner}
              myTodos={sharedProps.myTodos}
              allEvents={allEventsCombined}
              onRefresh={onRefresh}
              onTodoComplete={completeTodo}
              dayDate={dayDate}
              setDayDate={setDayDate}
              weekCalDate={weekCalDate}
              setWeekCalDate={setWeekCalDate}
              monthCalDate={monthCalDate}
              setMonthCalDate={setMonthCalDate}
              isDragging={!!draggingTodoId}
            />
          </div>
        ) : (
          <ResponsiveDashboard {...sharedProps} onTodoComplete={completeTodo} />
        )}

        {showProfile && (
          <UserModal
            user={user}
            googleConnected={googleConnected}
            onClose={() => setShowProfile(false)}
            onGoogleDisconnected={refresh}
            onSignOut={signOut}
          />
        )}

        {showQuests && (
          <QuestPanel
            open={showQuests}
            userId={user.id}
            initialQuestId={questPanelInitialId}
            onClose={() => { setShowQuests(false); setQuestPanelInitialId(null) }}
            onQuestsChanged={refreshPinnedQuests}
          />
        )}

        {showCheckin && (
          <CheckIn
            userName={myName}
            myTodos={myTodos.filter(t => !t.parent_id)}
            allEvents={allEvents}
            onDone={() => {
              setShowCheckin(false)
            }}
          />
        )}
      </div>

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
    </DndContext>
  )
}
