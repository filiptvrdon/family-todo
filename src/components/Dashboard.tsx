'use client'

import { useState, useCallback, useEffect, useId } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile, Todo, CalendarEvent, Quest } from '@/lib/types'
import CheckIn, { hasCheckedInToday } from '@/components/CheckIn'
import ProfileModal from '@/components/ProfileModal'
import QuestPanel from '@/components/QuestPanel'
import ResponsiveDashboard from '@/components/ResponsiveDashboard'
import { Heart, UserCircle, Moon, Sun, Swords } from 'lucide-react'
import { useTheme } from '@/lib/hooks/useTheme'
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
  profile: Profile
  partner: Profile | null
  myTodos: Todo[]
  partnerTodos: Todo[]
  allEvents: CalendarEvent[]
  googleConnected: boolean
  pinnedQuests: Quest[]
}

export default function Dashboard({ profile, partner, myTodos, partnerTodos, allEvents, googleConnected, pinnedQuests }: Props) {
  const [localMyTodos, setLocalMyTodos] = useState<Todo[]>(myTodos)
  const [localPartnerTodos, setLocalPartnerTodos] = useState<Todo[]>(partnerTodos)
  const [prevMyTodos, setPrevMyTodos] = useState(myTodos)
  const [prevPartnerTodos, setPrevPartnerTodos] = useState(partnerTodos)

  const [dayDate, setDayDate] = useState<Date>(new Date())
  const [weekCalDate, setWeekCalDate] = useState<Date>(new Date())
  const [monthCalDate, setMonthCalDate] = useState<Date>(new Date())
  const [draggingTodoId, setDraggingTodoId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const dndContextId = useId()

  if (myTodos !== prevMyTodos || partnerTodos !== prevPartnerTodos) {
    setPrevMyTodos(myTodos)
    setPrevPartnerTodos(partnerTodos)
    setLocalMyTodos(myTodos)
    setLocalPartnerTodos(partnerTodos)
  }

  const [showCheckin, setShowCheckin] = useState(() => {
    if (typeof window !== 'undefined') return !hasCheckedInToday()
    return false
  })
  const [showProfile, setShowProfile] = useState(false)
  const [showQuests, setShowQuests] = useState(false)
  const [questPanelInitialId, setQuestPanelInitialId] = useState<string | null>(null)
  const [localPinnedQuests, setLocalPinnedQuests] = useState<Quest[]>(pinnedQuests)
  const { isDark, toggle: toggleTheme } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  const refreshLocal = useCallback(async () => {
    const [{ data: mineRaw }, { data: theirsRaw }] = await Promise.all([
      supabase.from('todos').select('*, subtasks_count:todos(count)').eq('user_id', profile.id).is('parent_id', null).order('index', { ascending: true }),
      partner?.id
        ? supabase.from('todos').select('*, subtasks_count:todos(count)').eq('user_id', partner.id).is('parent_id', null).order('index', { ascending: true })
        : Promise.resolve({ data: [] as unknown as { count: number }[][] }),
    ])
    
    const mine = (mineRaw ?? []).map(t => ({
      ...t,
      subtasks_count: (t.subtasks_count as unknown as { count: number }[])?.[0]?.count ?? 0
    }))
    const theirs = (theirsRaw ?? []).map(t => ({
      ...t,
      subtasks_count: (t.subtasks_count as unknown as { count: number }[])?.[0]?.count ?? 0
    }))

    if (mine) setLocalMyTodos(mine)
    if (theirs) setLocalPartnerTodos(theirs ?? [])
  }, [supabase, profile.id, partner])

  const refresh = useCallback(() => router.refresh(), [router])

  const onRefresh = useCallback(() => {
    refreshLocal()
    refresh()
  }, [refreshLocal, refresh])

  const refreshPinnedQuests = useCallback(async () => {
    const { data } = await supabase
      .from('quests')
      .select('*')
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .eq('pinned', true)
      .order('created_at', { ascending: true })
      .limit(3)
    setLocalPinnedQuests(data ?? [])
  }, [supabase, profile.id])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (event.active.data.current?.source === 'todo-column') {
      setDraggingTodoId(event.active.id as string)
    }
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setDraggingTodoId(null)
    const supabase = createClient()

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
  }, [dayDate, onRefresh])

  const completeTodo = useCallback(async (todoId: string) => {
    setLocalMyTodos((prev) => prev.map((t) => t.id === todoId ? { ...t, completed: true } : t))
    await supabase.from('todos').update({ completed: true }).eq('id', todoId)
    refresh()
  }, [supabase, refresh])

  useEffect(() => {
    // Check-in logic is now handled in initial state
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const myName = profile?.display_name || profile?.email?.split('@')[0] || 'You'
  const partnerName = partner?.display_name || partner?.email?.split('@')[0] || 'Partner'

  const draggingTodo = draggingTodoId ? localMyTodos.find(t => t.id === draggingTodoId) ?? null : null

  const sharedProps = {
    profile,
    partner,
    myTodos: localMyTodos,
    partnerTodos: localPartnerTodos,
    allEvents,
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
  }

  return (
    <DndContext id={dndContextId} sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
        {/* ── Header ── */}
        <header className="shrink-0 bg-card border-b border-border shadow-[var(--shadow-card)]">
          <div className="layout-container py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Heart size={20} fill="currentColor" className="text-completion" />
              <span className="font-semibold text-foreground">Family Todo</span>
            </div>

            {/* Pinned quests */}
            <div className="flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar">
              {localPinnedQuests.map(quest => (
                <button
                  key={quest.id}
                  onClick={() => { setQuestPanelInitialId(quest.id); setShowQuests(true) }}
                  title={quest.name}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition shrink-0"
                  style={{ background: 'var(--color-foam)', color: 'var(--color-primary-dark)' }}
                >
                  <span>{quest.icon}</span>
                  <span className="max-w-[80px] truncate hidden sm:inline">{quest.name}</span>
                </button>
              ))}
              <button
                onClick={() => { setQuestPanelInitialId(null); setShowQuests(true) }}
                className="flex items-center justify-center w-8 h-8 rounded-full transition text-muted-foreground hover:text-foreground shrink-0"
                title="Quests"
              >
                <Swords size={17} />
              </button>
            </div>

            <div className="flex items-center gap-3 shrink-0">
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
                title="Your profile"
              >
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="rounded-full object-cover size-7 border-2 border-foam"
                  />
                ) : (
                  <UserCircle size={24} className="text-text-disabled" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* ── Responsive Shell ── */}
        <ResponsiveDashboard {...sharedProps} onTodoComplete={completeTodo} />

        {showProfile && (
          <ProfileModal
            profile={profile}
            googleConnected={googleConnected}
            onClose={() => setShowProfile(false)}
            onSaved={refresh}
            onGoogleDisconnected={refresh}
            onSignOut={signOut}
          />
        )}

        {showQuests && (
          <QuestPanel
            open={showQuests}
            userId={profile.id}
            initialQuestId={questPanelInitialId}
            onClose={() => { setShowQuests(false); setQuestPanelInitialId(null) }}
            onQuestsChanged={refreshPinnedQuests}
          />
        )}

        {showCheckin && (
          <CheckIn
            userName={myName}
            myTodos={localMyTodos}
            allEvents={allEvents}
            onDone={() => {
              setShowCheckin(false)
              refreshLocal()
              refresh()
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
