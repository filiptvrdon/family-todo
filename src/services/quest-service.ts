import { SupabaseClient } from '@supabase/supabase-js'
import { Quest } from '@/lib/types'

export async function fetchQuests(
  supabase: SupabaseClient,
  userId: string
): Promise<Quest[]> {
  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('user_id', userId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createQuest(
  supabase: SupabaseClient,
  quest: Omit<Quest, 'id' | 'created_at' | 'momentum' | 'day_start_momentum' | 'last_momentum_increase' | 'last_momentum_decay' | 'last_momentum_nudge' | 'motivation_nudge'>
): Promise<Quest> {
  const { data, error } = await supabase
    .from('quests')
    .insert([quest])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateQuest(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Quest>
): Promise<Quest> {
  const { data, error } = await supabase
    .from('quests')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteQuest(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('quests')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function fetchLinkedTasks(
  supabase: SupabaseClient,
  questId: string
) {
  const { data, error } = await supabase
    .from('quest_tasks')
    .select('task_id, todos(id, title, completed)')
    .eq('quest_id', questId)
  if (error) throw error
  
  return (data ?? []).map((row) => {
    const t = Array.isArray(row.todos) ? row.todos[0] : row.todos
    return t
  }).filter(Boolean)
}

export async function linkTask(
  supabase: SupabaseClient,
  questId: string,
  taskId: string
): Promise<void> {
  const { error } = await supabase
    .from('quest_tasks')
    .insert([{ quest_id: questId, task_id: taskId }])
  if (error) throw error
}

export async function unlinkTask(
  supabase: SupabaseClient,
  questId: string,
  taskId: string
): Promise<void> {
  const { error } = await supabase
    .from('quest_tasks')
    .delete()
    .eq('quest_id', questId)
    .eq('task_id', taskId)
  if (error) throw error
}
