import { SupabaseClient } from '@supabase/supabase-js'
import { Habit, HabitTracking } from '@/lib/types'

// ── Habits ────────────────────────────────────────────────────────────────────

export async function fetchHabits(
  supabase: SupabaseClient,
  userId: string
): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('index')
  if (error) throw error
  return data ?? []
}

export async function createHabit(
  supabase: SupabaseClient,
  habit: Omit<Habit, 'id' | 'created_at'>
): Promise<Habit> {
  const { data, error } = await supabase
    .from('habits')
    .insert([habit])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateHabit(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Omit<Habit, 'id' | 'created_at' | 'user_id'>>
): Promise<Habit> {
  const { data, error } = await supabase
    .from('habits')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteHabit(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Habit Tracking ────────────────────────────────────────────────────────────

export async function fetchTrackingForPeriod(
  supabase: SupabaseClient,
  userId: string,
  periodDates: string[]   // array of YYYY-MM-DD dates to fetch in one query
): Promise<HabitTracking[]> {
  const { data, error } = await supabase
    .from('habit_tracking')
    .select('*')
    .eq('user_id', userId)
    .in('period_date', periodDates)
    .order('logged_at')
  if (error) throw error
  return data ?? []
}

export async function logEntry(
  supabase: SupabaseClient,
  entry: Omit<HabitTracking, 'id' | 'logged_at'>
): Promise<HabitTracking> {
  const { data, error } = await supabase
    .from('habit_tracking')
    .insert([entry])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEntry(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('habit_tracking')
    .delete()
    .eq('id', id)
  if (error) throw error
}
