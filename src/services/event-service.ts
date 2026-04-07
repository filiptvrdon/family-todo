import { SupabaseClient } from '@supabase/supabase-js'
import { CalendarEvent } from '@/lib/types'

export async function fetchCalendarEvents(
  supabase: SupabaseClient,
  userId: string,
  partnerId: string | null = null
): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .or(`user_id.eq.${userId}${partnerId ? `,user_id.eq.${partnerId}` : ''}`)
    .order('start_time')
  if (error) throw error
  return data || []
}

export async function createEvent(
  supabase: SupabaseClient,
  event: Omit<CalendarEvent, 'id' | 'created_at'>
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert([event])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEvent(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEvent(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id)
  if (error) throw error
}
