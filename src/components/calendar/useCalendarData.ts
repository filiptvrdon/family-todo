import { useMemo } from 'react'
import { format } from 'date-fns'
import { CalendarEvent, Todo } from '@/lib/types'

export interface DayData {
  events: CalendarEvent[]
  todos: Todo[]
}

export type DayMap = Map<string, DayData>

function emptyDay(): DayData {
  return { events: [], todos: [] }
}

/**
 * Buckets events and todos into a Map<YYYY-MM-DD, DayData>.
 * Pure computation — no fetch, no side effects.
 */
export function useCalendarData(
  events: CalendarEvent[],
  todos: Todo[],
): DayMap {
  return useMemo(() => {
    const map: DayMap = new Map()

    for (const event of events) {
      const key = format(new Date(event.start_time), 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, emptyDay())
      map.get(key)!.events.push(event)
    }

    for (const todo of todos) {
      if (!todo.due_date) continue
      const key = todo.due_date
      if (!map.has(key)) map.set(key, emptyDay())
      map.get(key)!.todos.push(todo)
    }

    return map
  }, [events, todos])
}
