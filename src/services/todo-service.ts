import { SupabaseClient } from '@supabase/supabase-js'
import { Todo } from '@/lib/types'

interface RawTodo extends Record<string, unknown> {
  subtasks_count?: number | { count: number } | { count: number }[]
}

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
  
  return (data || []).map((todo: RawTodo) => {
    let count = 0
    if (typeof todo.subtasks_count === 'number') {
      count = todo.subtasks_count
    } else if (Array.isArray(todo.subtasks_count)) {
      count = (todo.subtasks_count[0] as { count: number })?.count ?? 0
    } else if (todo.subtasks_count && typeof todo.subtasks_count === 'object') {
      count = (todo.subtasks_count as { count: number }).count ?? 0
    }

    return {
      ...todo,
      subtasks_count: count
    } as Todo
  })
}

export async function fetchTodoById(
  supabase: SupabaseClient,
  id: string
): Promise<Todo | null> {
  const { data, error } = await supabase
    .from('todos')
    .select('*, subtasks_count:todos!parent_id(count)')
    .eq('id', id)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  
  const todo = data as RawTodo
  let count = 0
  if (typeof todo.subtasks_count === 'number') {
    count = todo.subtasks_count
  } else if (Array.isArray(todo.subtasks_count)) {
    count = (todo.subtasks_count[0] as { count: number })?.count ?? 0
  } else if (todo.subtasks_count && typeof todo.subtasks_count === 'object') {
    count = (todo.subtasks_count as { count: number }).count ?? 0
  }

  return {
    ...todo,
    subtasks_count: count
  } as Todo
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
  
  return (data || []).map((todo: RawTodo) => {
    let count = 0
    if (typeof todo.subtasks_count === 'number') {
      count = todo.subtasks_count
    } else if (Array.isArray(todo.subtasks_count)) {
      count = (todo.subtasks_count[0] as { count: number })?.count ?? 0
    } else if (todo.subtasks_count && typeof todo.subtasks_count === 'object') {
      count = (todo.subtasks_count as { count: number }).count ?? 0
    }

    return {
      ...todo,
      subtasks_count: count
    } as Todo
  })
}

export async function createTodo(
  supabase: SupabaseClient,
  todo: Omit<Todo, 'id' | 'created_at'>
): Promise<Todo> {
  const insertData = { ...todo } as Record<string, unknown>
  delete insertData.subtasks_count
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
  const updateData = { ...patch } as Record<string, unknown>
  delete updateData.subtasks_count
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
