import { create } from 'zustand'
import { CalendarEvent } from '@/lib/types'
import {
  initLocalDb,
  localDbGetAll,
  localDbUpsert,
  localDbUpsertLocal,
  localDbUpsertMany,
  localDbSoftDelete,
  localDbHardDelete,
  persistLocalDb,
  isOfflineError,
} from '@/lib/local-db'

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
    const id = crypto.randomUUID()
    const optimistic = { ...event, id, created_at: new Date().toISOString() } as CalendarEvent
    set(s => ({ events: [...s.events, optimistic] }))
    localDbUpsertLocal('calendar_events', optimistic as unknown as Record<string, unknown>)
    void persistLocalDb()

    try {
      const created = await apiFetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...event, id }),
      })
      localDbUpsert('calendar_events', created)
      void persistLocalDb()
      set(s => ({ events: s.events.map(e => e.id === id ? created : e) }))
    } catch (err) {
      console.error('Failed to add event:', err)
      if (!isOfflineError(err)) {
        localDbHardDelete('calendar_events', id)
        void persistLocalDb()
        set(s => ({ events: s.events.filter(e => e.id !== id) }))
      }
    }
  },

  updateEvent: async (id, patch) => {
    const prev = get().events.find(e => e.id === id)
    set(s => ({ events: s.events.map(e => e.id === id ? { ...e, ...patch } : e) }))
    localDbUpsertLocal('calendar_events', { ...prev, ...patch } as Record<string, unknown>)
    void persistLocalDb()

    try {
      const result = await apiFetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      localDbUpsert('calendar_events', result)
      void persistLocalDb()
    } catch (err) {
      console.error('Failed to update event:', err)
      if (!isOfflineError(err) && prev) {
        set(s => ({ events: s.events.map(e => e.id === id ? prev : e) }))
        localDbUpsert('calendar_events', prev as unknown as Record<string, unknown>)
        void persistLocalDb()
      }
    }
  },

  deleteEvent: async (id) => {
    const prev = get().events.find(e => e.id === id)
    set(s => ({ events: s.events.filter(e => e.id !== id) }))
    localDbSoftDelete('calendar_events', id)
    void persistLocalDb()

    try {
      await apiFetch(`/api/events/${id}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to delete event:', err)
      if (!isOfflineError(err) && prev) {
        set(s => ({ events: [...s.events, prev] }))
        localDbUpsert('calendar_events', prev as unknown as Record<string, unknown>)
        void persistLocalDb()
      }
    }
  },

  subscribe: (userId, partnerId) => {
    const loadFromLocal = () => {
      const local = localDbGetAll<CalendarEvent>('calendar_events').filter(
        e => e.user_id === userId || (partnerId ? e.user_id === partnerId : false)
      )
      if (local.length === 0) return
      set({ events: local, loading: false })
    }

    const load = async () => {
      await initLocalDb()
      loadFromLocal()

      try {
        const events = await apiFetch('/api/events')
        set({ events, loading: false })
        localDbUpsertMany('calendar_events', events)
        void persistLocalDb()
      } catch (err) {
        console.error('[event-store] refetch failed:', err)
        const local = localDbGetAll<CalendarEvent>('calendar_events').filter(
          e => e.user_id === userId || (partnerId ? e.user_id === partnerId : false)
        )
        if (local.length === 0) set({ loading: false })
      }
    }

    load()

    const onSync = () => loadFromLocal()
    window.addEventListener('sync-done', onSync)
    return () => window.removeEventListener('sync-done', onSync)
  },
}))
