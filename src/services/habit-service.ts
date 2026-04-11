import sql from '@/lib/db'
import { Habit, HabitTracking } from '@/lib/types'

// ── Habits ────────────────────────────────────────────────────────────────────

export async function fetchHabits(userId: string): Promise<Habit[]> {
  return sql<Habit[]>`
    SELECT * FROM habits
    WHERE user_id = ${userId} AND is_archived = false
    ORDER BY index
  `
}

export async function createHabit(habit: Omit<Habit, 'id' | 'created_at'>): Promise<Habit> {
  const [row] = await sql<Habit[]>`INSERT INTO habits ${sql(habit as Record<string, unknown>)} RETURNING *`
  return row
}

export async function updateHabit(
  id: string,
  patch: Partial<Omit<Habit, 'id' | 'created_at' | 'user_id'>>
): Promise<Habit> {
  const filtered = Object.fromEntries(
    Object.entries(patch as Record<string, unknown>).filter(([, v]) => v !== undefined)
  )
  const [row] = await sql<Habit[]>`UPDATE habits SET ${sql(filtered)} WHERE id = ${id} RETURNING *`
  return row
}

export async function deleteHabit(id: string): Promise<void> {
  await sql`DELETE FROM habits WHERE id = ${id}`
}

// ── Habit Tracking ────────────────────────────────────────────────────────────

export async function fetchTrackingForPeriod(
  userId: string,
  periodDates: string[]
): Promise<HabitTracking[]> {
  if (periodDates.length === 0) return []
  return sql<HabitTracking[]>`
    SELECT * FROM habit_tracking
    WHERE user_id = ${userId}
      AND period_date = ANY(${periodDates}::date[])
    ORDER BY logged_at
  `
}

export async function logEntry(entry: Omit<HabitTracking, 'id' | 'logged_at'>): Promise<HabitTracking> {
  const [row] = await sql<HabitTracking[]>`INSERT INTO habit_tracking ${sql(entry as Record<string, unknown>)} RETURNING *`
  return row
}

export async function deleteEntry(id: string): Promise<void> {
  await sql`DELETE FROM habit_tracking WHERE id = ${id}`
}
