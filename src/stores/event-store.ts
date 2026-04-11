import { create } from 'zustand'
import { CalendarEvent } from '@/lib/types'

interface EventStore {
  events: CalendarEvent[]
  loading: boolean
  addEvent: (event: Omit<CalendarEvent, 'id' | 'created_at'>) => Promise<void>
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  subscribe: (userId: string, partnerId: string | null) => () => void
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, options)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  loading: true,

  addEvent: async (event) => {
    const tempId = `temp-${Date.now()}`
    const optimistic = { ...event, id: tempId, created_at: new Date().toISOString() } as CalendarEvent
    set(s => ({ events: [...s.events, optimistic] }))

    try {
      const created = await apiFetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      })
      set(s => ({ events: s.events.map(e => e.id === tempId ? created : e) }))
    } catch (err) {
      console.error('Failed to add event:', err)
      set(s => ({ events: s.events.filter(e => e.id !== tempId) }))
    }
  },

  updateEvent: async (id, patch) => {
    const prev = get().events.find(e => e.id === id)
    set(s => ({ events: s.events.map(e => e.id === id ? { ...e, ...patch } : e) }))

    try {
      await apiFetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } catch (err) {
      console.error('Failed to update event:', err)
      if (prev) set(s => ({ events: s.events.map(e => e.id === id ? prev : e) }))
    }
  },

  deleteEvent: async (id) => {
    const prev = get().events.find(e => e.id === id)
    set(s => ({ events: s.events.filter(e => e.id !== id) }))

    try {
      await apiFetch(`/api/events/${id}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to delete event:', err)
      if (prev) set(s => ({ events: [...s.events, prev] }))
    }
  },

  subscribe: (_userId, _partnerId) => {
    const refetch = async () => {
      try {
        const events = await apiFetch('/api/events')
        set({ events, loading: false })
      } catch (err) {
        console.error('[event-store] refetch failed:', err)
        set({ loading: false })
      }
    }

    refetch()

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) refetch()
    }, 5000)

    return () => clearInterval(interval)
  },
}))
