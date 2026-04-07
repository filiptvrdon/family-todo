import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import * as eventService from '@/services/event-service'
import { CalendarEvent } from '@/lib/types'

const supabase = createClient()

interface EventStore {
  events: CalendarEvent[]
  loading: boolean
  // Mutations
  addEvent: (event: Omit<CalendarEvent, 'id' | 'created_at'>) => Promise<void>
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  // Realtime lifecycle
  subscribe: (userId: string, partnerId: string | null) => () => void
}

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  loading: true,

  addEvent: async (event) => {
    const tempId = `temp-${Date.now()}`
    const optimistic = { 
      ...event, 
      id: tempId, 
      created_at: new Date().toISOString() 
    } as CalendarEvent
    
    set(s => ({ events: [...s.events, optimistic] }))
    
    try {
      const created = await eventService.createEvent(supabase, event)
      set(s => ({ 
        events: s.events.map(e => e.id === tempId ? created : e) 
      }))
    } catch (err: any) {
      console.error('Failed to add event:', err.message || err)
      set(s => ({ 
        events: s.events.filter(e => e.id !== tempId) 
      }))
    }
  },

  updateEvent: async (id, patch) => {
    const prev = get().events.find(e => e.id === id)
    set(s => ({
      events: s.events.map(e => e.id === id ? { ...e, ...patch } : e)
    }))

    try {
      await eventService.updateEvent(supabase, id, patch)
    } catch (err: any) {
      console.error('Failed to update event:', err.message || err)
      if (prev) {
        set(s => ({
          events: s.events.map(e => e.id === id ? prev : e)
        }))
      }
    }
  },

  deleteEvent: async (id) => {
    const prev = get().events.find(e => e.id === id)
    set(s => ({
      events: s.events.filter(e => e.id !== id)
    }))

    try {
      await eventService.deleteEvent(supabase, id)
    } catch (err: any) {
      console.error('Failed to delete event:', err.message || err)
      if (prev) {
        set(s => ({
          events: [...s.events, prev]
        }))
      }
    }
  },

  subscribe: (userId, partnerId) => {
    const refetch = async () => {
      const events = await eventService.fetchCalendarEvents(supabase, userId, partnerId)
      set({ events, loading: false })
    }

    const channel = supabase
      .channel('events-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events', filter: `user_id=eq.${userId}` },
        ({ eventType, new: record, old }) => {
          set(s => {
            const events = s.events
            if (eventType === 'INSERT') return { events: [...events, record as CalendarEvent] }
            if (eventType === 'UPDATE') return { events: events.map(e => e.id === record.id ? { ...e, ...(record as CalendarEvent) } : e) }
            if (eventType === 'DELETE') return { events: events.filter(e => e.id !== old.id) }
            return s
          })
        }
      )

    if (partnerId) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events', filter: `user_id=eq.${partnerId}` },
        ({ eventType, new: record, old }) => {
          set(s => {
            const events = s.events
            if (eventType === 'INSERT') return { events: [...events, record as CalendarEvent] }
            if (eventType === 'UPDATE') return { events: events.map(e => e.id === record.id ? { ...e, ...(record as CalendarEvent) } : e) }
            if (eventType === 'DELETE') return { events: events.filter(e => e.id !== old.id) }
            return s
          })
        }
      )
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        refetch()
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  },
}))
