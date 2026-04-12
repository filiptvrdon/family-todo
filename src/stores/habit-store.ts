import { create } from 'zustand'
import { Habit, HabitTracking } from '@/lib/types'


/** Returns today's date as YYYY-MM-DD in local time */
export function todayDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Returns the Monday of the current week as YYYY-MM-DD */
export function weekStartDate(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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
  tracking: HabitTracking[]
  loading: boolean
  dateEntries: (habitId: string, dateStr: string) => HabitTracking[]
  weekEntries: (habitId: string, dateStr: string) => HabitTracking[]
  periodTotal: (habitId: string, dateStr: string) => number
  addHabit: (habit: Omit<Habit, 'id' | 'created_at'>) => Promise<void>
  updateHabit: (id: string, patch: Partial<Omit<Habit, 'id' | 'created_at' | 'user_id'>>) => Promise<void>
  deleteHabit: (id: string) => Promise<void>
  logEntry: (entry: Omit<HabitTracking, 'id' | 'logged_at'>) => Promise<void>
  removeLastEntry: (habitId: string, dateStr: string) => Promise<void>
  removeEntry: (entryId: string) => Promise<void>
  subscribe: (userId: string) => () => void
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, options)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const useHabitStore = create<HabitStore>((set, get) => ({
  myHabits: [],
  tracking: [],
  loading: true,

  dateEntries: (habitId, dateStr) => {
    return get().tracking.filter(e => e.habit_id === habitId && e.period_date === dateStr)
  },

  weekEntries: (habitId, dateStr) => {
    // Find the Monday of the week containing dateStr
    const d = new Date(dateStr)
    const day = d.getDay()
    const diff = (day === 0 ? -6 : 1 - day)
    d.setDate(d.getDate() + diff)
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    
    return get().tracking.filter(
      e => e.habit_id === habitId && e.period_date >= start && e.period_date <= dateStr
    )
  },

  periodTotal: (habitId, dateStr) => {
    const habit = get().myHabits.find(h => h.id === habitId)
    if (!habit) return 0
    const entries = habit.goal_period === 'daily'
      ? get().dateEntries(habitId, dateStr)
      : get().weekEntries(habitId, dateStr)
    return entries.reduce((sum, e) => sum + e.value, 0)
  },

  addHabit: async (habit) => {
    const tempId = `temp-${Date.now()}`
    const optimistic: Habit = { ...habit, id: tempId, created_at: new Date().toISOString() }
    set(s => ({ myHabits: [...s.myHabits, optimistic] }))
    try {
      const created = await apiFetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(habit),
      })
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
      await apiFetch(`/api/habits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } catch (err) {
      console.error('Failed to update habit:', err)
      if (prev) set(s => ({ myHabits: s.myHabits.map(h => h.id === id ? prev : h) }))
    }
  },

  deleteHabit: async (id) => {
    const prev = get().myHabits.find(h => h.id === id)
    set(s => ({ myHabits: s.myHabits.filter(h => h.id !== id) }))
    try {
      await apiFetch(`/api/habits/${id}`, { method: 'DELETE' })
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
      const created = await apiFetch('/api/habit-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
      set(s => ({ tracking: s.tracking.map(e => e.id === tempId ? created : e) }))
    } catch (err) {
      console.error('Failed to log habit entry:', err)
      set(s => ({ tracking: s.tracking.filter(e => e.id !== tempId) }))
    }
  },

  removeLastEntry: async (habitId, dateStr) => {
    const entries = get().tracking
      .filter(e => e.habit_id === habitId && e.period_date === dateStr)
      .sort((a, b) => b.logged_at.localeCompare(a.logged_at))
    const last = entries[0]
    if (!last) return
    set(s => ({ tracking: s.tracking.filter(e => e.id !== last.id) }))
    try {
      await apiFetch(`/api/habit-tracking/${last.id}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to remove habit entry:', err)
      set(s => ({ tracking: [...s.tracking, last] }))
    }
  },

  removeEntry: async (entryId) => {
    const entry = get().tracking.find(e => e.id === entryId)
    set(s => ({ tracking: s.tracking.filter(e => e.id !== entryId) }))
    try {
      await apiFetch(`/api/habit-tracking/${entryId}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to remove habit entry:', err)
      if (entry) set(s => ({ tracking: [...s.tracking, entry] }))
    }
  },

  subscribe: (_userId) => {
    const refetch = async () => {
      try {
        const dates = weekDates()
        const [habits, tracking] = await Promise.all([
          apiFetch('/api/habits'),
          apiFetch(`/api/habit-tracking?dates=${dates.join(',')}`),
        ])
        set({ myHabits: habits, tracking, loading: false })
      } catch (err) {
        console.error('[habit-store] refetch failed:', err)
        set({ loading: false })
      }
    }

    refetch()

    return () => {}
  },
}))
