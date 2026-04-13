import sql from '@/lib/db'
import { CalendarEvent } from '@/lib/types'

export async function fetchCalendarEvents(
  userId: string,
  partnerId: string | null = null
): Promise<CalendarEvent[]> {
  if (partnerId) {
    return sql<CalendarEvent[]>`
      SELECT * FROM calendar_events
      WHERE (user_id = ${userId} OR user_id = ${partnerId})
        AND deleted_at IS NULL
      ORDER BY start_time
    `
  }
  return sql<CalendarEvent[]>`
    SELECT * FROM calendar_events
    WHERE user_id = ${userId}
      AND deleted_at IS NULL
    ORDER BY start_time
  `
}

export async function createEvent(event: Omit<CalendarEvent, 'id' | 'created_at'>): Promise<CalendarEvent> {
  const [row] = await sql<CalendarEvent[]>`INSERT INTO calendar_events ${sql(event as Record<string, unknown>)} RETURNING *`
  return row
}

export async function updateEvent(id: string, patch: Partial<CalendarEvent>): Promise<CalendarEvent> {
  const { id: _id, created_at, ...data } = patch as Record<string, unknown>
  void _id; void created_at
  const filtered = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  const [row] = await sql<CalendarEvent[]>`UPDATE calendar_events SET ${sql(filtered)} WHERE id = ${id} RETURNING *`
  return row
}

export async function deleteEvent(id: string): Promise<void> {
  await sql`UPDATE calendar_events SET deleted_at = NOW() WHERE id = ${id}`
}
