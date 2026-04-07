import { SupabaseClient } from '@supabase/supabase-js'
import { Todo } from '@/lib/types'

export async function fetchTodos(
  supabase: SupabaseClient,
  userId: string
): Promise<Todo[]> {
  const { data, error } = await supabase
    .from('todos')
    .select('*, subtasks_count:todos!parent_id(count)')
    .eq('user_id', userId)
    .order('index')
  if (error) throw error
  
  return (data || []).map((todo: any) => ({
    ...todo,
    subtasks_count: typeof todo.subtasks_count === 'number'
      ? todo.subtasks_count
      : Array.isArray(todo.subtasks_count)
        ? (todo.subtasks_count[0]?.count ?? 0)
        : (todo.subtasks_count?.count ?? 0)
  })) as Todo[]
}

export async function fetchSubtasks(
  supabase: SupabaseClient,
  parentId: string
): Promise<Todo[]> {
  const { data, error } = await supabase
    .from('todos')
    .select('*, subtasks_count:todos!parent_id(count)')
    .eq('parent_id', parentId)
    .order('index')
  if (error) throw error
  
  return (data || []).map((todo: any) => ({
    ...todo,
    subtasks_count: typeof todo.subtasks_count === 'number'
      ? todo.subtasks_count
      : Array.isArray(todo.subtasks_count)
        ? (todo.subtasks_count[0]?.count ?? 0)
        : (todo.subtasks_count?.count ?? 0)
  })) as Todo[]
}

export async function createTodo(
  supabase: SupabaseClient,
  todo: Omit<Todo, 'id' | 'created_at'>
): Promise<Todo> {
  const { subtasks_count, ...insertData } = todo as any
  const { data, error } = await supabase
    .from('todos')
    .insert([insertData])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTodo(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Todo>
): Promise<Todo> {
  const { subtasks_count, ...updateData } = patch as any
  const { data, error } = await supabase
    .from('todos')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTodo(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function toggleTodo(
  supabase: SupabaseClient,
  id: string,
  completed: boolean
): Promise<Todo> {
  const { data, error } = await supabase
    .from('todos')
    .update({ completed })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
