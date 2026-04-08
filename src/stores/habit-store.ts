import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import * as habitService from '@/services/habit-service'
import { Habit, HabitTracking } from '@/lib/types'

const supabase = createClient()

/** Returns today's date as YYYY-MM-DD in local time */
export function todayDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Returns the Monday of the current week as YYYY-MM-DD */
export function weekStartDate(): string {
  const d = new Date()
  const day = d.getDay() // 0 = Sun
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** All dates from weekStart through today (YYYY-MM-DD) */
function weekDates(): string[] {
  const start = new Date(weekStartDate())
  const today = new Date(todayDate())
  const dates: string[] = []
  const cur = new Date(start)
  while (cur <= today) {
    dates.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`)
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

interface HabitStore {
  myHabits: Habit[]
  tracking: HabitTracking[]        // entries for current day (daily) + current week (weekly)
  loading: boolean

  // Queries
  todayEntries: (habitId: string) => HabitTracking[]
  weekEntries: (habitId: string) => HabitTracking[]
  periodTotal: (habitId: string) => number

  // Habit mutations
  addHabit: (habit: Omit<Habit, 'id' | 'created_at'>) => Promise<void>
  updateHabit: (id: string, patch: Partial<Omit<Habit, 'id' | 'created_at' | 'user_id'>>) => Promise<void>
  deleteHabit: (id: string) => Promise<void>

  // Tracking mutations
  logEntry: (entry: Omit<HabitTracking, 'id' | 'logged_at'>) => Promise<void>
  removeLastEntry: (habitId: string) => Promise<void>
  removeEntry: (entryId: string) => Promise<void>

  // Realtime lifecycle
  subscribe: (userId: string) => () => void
}

export const useHabitStore = create<HabitStore>((set, get) => ({
  myHabits: [],
  tracking: [],
  loading: true,

  todayEntries: (habitId) => {
    const today = todayDate()
    return get().tracking.filter(e => e.habit_id === habitId && e.period_date === today)
  },

  weekEntries: (habitId) => {
    const start = weekStartDate()
    const today = todayDate()
    return get().tracking.filter(
      e => e.habit_id === habitId && e.period_date >= start && e.period_date <= today
    )
  },

  periodTotal: (habitId) => {
    const habit = get().myHabits.find(h => h.id === habitId)
    if (!habit) return 0
    const entries = habit.goal_period === 'daily'
      ? get().todayEntries(habitId)
      : get().weekEntries(habitId)
    return entries.reduce((sum, e) => sum + e.value, 0)
  },

  addHabit: async (habit) => {
    const tempId = `temp-${Date.now()}`
    const optimistic: Habit = { ...habit, id: tempId, created_at: new Date().toISOString() }
    set(s => ({ myHabits: [...s.myHabits, optimistic] }))
    try {
      const created = await habitService.createHabit(supabase, habit)
      set(s => ({ myHabits: s.myHabits.map(h => h.id === tempId ? created : h) }))
    } catch (err) {
      console.error('Failed to add habit:', err)
      set(s => ({ myHabits: s.myHabits.filter(h => h.id !== tempId) }))
    }
  },

  updateHabit: async (id, patch) => {
    const prev = get().myHabits.find(h => h.id === id)
    set(s => ({ myHabits: s.myHabits.map(h => h.id === id ? { ...h, ...patch } : h) }))
    try {
      await habitService.updateHabit(supabase, id, patch)
    } catch (err) {
      console.error('Failed to update habit:', err)
      if (prev) set(s => ({ myHabits: s.myHabits.map(h => h.id === id ? prev : h) }))
    }
  },

  deleteHabit: async (id) => {
    const prev = get().myHabits.find(h => h.id === id)
    set(s => ({ myHabits: s.myHabits.filter(h => h.id !== id) }))
    try {
      await habitService.deleteHabit(supabase, id)
    } catch (err) {
      console.error('Failed to delete habit:', err)
      if (prev) set(s => ({ myHabits: [...s.myHabits, prev] }))
    }
  },

  logEntry: async (entry) => {
    const tempId = `temp-${Date.now()}`
    const optimistic: HabitTracking = { ...entry, id: tempId, logged_at: new Date().toISOString() }
    set(s => ({ tracking: [...s.tracking, optimistic] }))
    try {
      const created = await habitService.logEntry(supabase, entry)
      set(s => ({ tracking: s.tracking.map(e => e.id === tempId ? created : e) }))
    } catch (err) {
      console.error('Failed to log habit entry:', err)
      set(s => ({ tracking: s.tracking.filter(e => e.id !== tempId) }))
    }
  },

  removeLastEntry: async (habitId) => {
    const today = todayDate()
    const entries = get().tracking
      .filter(e => e.habit_id === habitId && e.period_date === today)
      .sort((a, b) => b.logged_at.localeCompare(a.logged_at))
    const last = entries[0]
    if (!last) return
    set(s => ({ tracking: s.tracking.filter(e => e.id !== last.id) }))
    try {
      await habitService.deleteEntry(supabase, last.id)
    } catch (err) {
      console.error('Failed to remove habit entry:', err)
      set(s => ({ tracking: [...s.tracking, last] }))
    }
  },

  removeEntry: async (entryId) => {
    const entry = get().tracking.find(e => e.id === entryId)
    set(s => ({ tracking: s.tracking.filter(e => e.id !== entryId) }))
    try {
      await habitService.deleteEntry(supabase, entryId)
    } catch (err) {
      console.error('Failed to remove habit entry:', err)
      if (entry) set(s => ({ tracking: [...s.tracking, entry] }))
    }
  },

  subscribe: (userId) => {
    const refetch = async () => {
      const dates = weekDates()
      const [habits, tracking] = await Promise.all([
        habitService.fetchHabits(supabase, userId),
        habitService.fetchTrackingForPeriod(supabase, userId, dates),
      ])
      set({ myHabits: habits, tracking, loading: false })
    }

    const channel = supabase
      .channel('habits-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` },
        ({ eventType, new: record, old }) => {
          set(s => {
            const habits = s.myHabits
            if (eventType === 'INSERT') return { myHabits: [...habits, record as Habit] }
            if (eventType === 'UPDATE') return { myHabits: habits.map(h => h.id === record.id ? { ...h, ...(record as Habit) } : h) }
            if (eventType === 'DELETE') return { myHabits: habits.filter(h => h.id !== old.id) }
            return s
          })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'habit_tracking', filter: `user_id=eq.${userId}` },
        ({ eventType, new: record, old }) => {
          set(s => {
            const tracking = s.tracking
            if (eventType === 'INSERT') return { tracking: [...tracking, record as HabitTracking] }
            if (eventType === 'UPDATE') return { tracking: tracking.map(e => e.id === record.id ? { ...e, ...(record as HabitTracking) } : e) }
            if (eventType === 'DELETE') return { tracking: tracking.filter(e => e.id !== old.id) }
            return s
          })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') refetch()
      })

    return () => { supabase.removeChannel(channel) }
  },
}))
