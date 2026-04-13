import sql from '@/lib/db'
import { Todo } from '@/lib/types'

// Strip non-column fields before sending to DB
function cleanTodo(data: Record<string, unknown>): Record<string, unknown> {
  const { subtasks_count, ...rest } = data
  void subtasks_count
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined))
}

function parseTodo(row: Record<string, unknown>): Todo {
  return { ...row, subtasks_count: Number(row.subtasks_count ?? 0) } as Todo
}

export async function fetchTodos(userId: string): Promise<Todo[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT t.*,
      (SELECT COUNT(*) FROM todos WHERE parent_id = t.id AND deleted_at IS NULL)::int AS subtasks_count
    FROM todos t
    WHERE t.user_id = ${userId}
      AND t.deleted_at IS NULL
    ORDER BY t.index
  `
  return rows.map(parseTodo)
}

export async function fetchTopLevelTodos(userId: string): Promise<Todo[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT t.*,
      (SELECT COUNT(*) FROM todos WHERE parent_id = t.id AND deleted_at IS NULL)::int AS subtasks_count
    FROM todos t
    WHERE t.user_id = ${userId}
      AND t.parent_id IS NULL
      AND t.deleted_at IS NULL
    ORDER BY t.index
  `
  return rows.map(parseTodo)
}

export async function fetchTodoById(id: string): Promise<Todo | null> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT t.*,
      (SELECT COUNT(*) FROM todos WHERE parent_id = t.id AND deleted_at IS NULL)::int AS subtasks_count
    FROM todos t
    WHERE t.id = ${id}
      AND t.deleted_at IS NULL
  `
  return rows[0] ? parseTodo(rows[0]) : null
}

export async function fetchSubtasks(parentId: string): Promise<Todo[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT t.*,
      (SELECT COUNT(*) FROM todos WHERE parent_id = t.id AND deleted_at IS NULL)::int AS subtasks_count
    FROM todos t
    WHERE t.parent_id = ${parentId}
      AND t.deleted_at IS NULL
    ORDER BY t.index
  `
  return rows.map(parseTodo)
}

export async function createTodo(todo: Omit<Todo, 'id' | 'created_at'>): Promise<Todo> {
  const data = cleanTodo(todo as Record<string, unknown>)
  const [row] = await sql<Record<string, unknown>[]>`
    INSERT INTO todos ${sql(data)} RETURNING *
  `
  return parseTodo({ ...row, subtasks_count: 0 })
}

export async function updateTodo(id: string, patch: Partial<Todo>): Promise<Todo> {
  const data = cleanTodo(patch as Record<string, unknown>)
  if (Object.keys(data).length === 0) {
    const existing = await fetchTodoById(id)
    if (!existing) throw new Error('Todo not found')
    return existing
  }
  const [row] = await sql<Record<string, unknown>[]>`
    UPDATE todos SET ${sql(data)} WHERE id = ${id} RETURNING *
  `
  return parseTodo({ ...row, subtasks_count: 0 })
}

export async function deleteTodo(id: string): Promise<void> {
  await sql`UPDATE todos SET deleted_at = NOW() WHERE id = ${id}`
}

export async function toggleTodo(id: string, completed: boolean): Promise<Todo> {
  const completedAt = completed ? new Date().toISOString() : null
  const [row] = await sql<Record<string, unknown>[]>`
    UPDATE todos
    SET completed = ${completed}, completed_at = ${completedAt}
    WHERE id = ${id}
    RETURNING *
  `
  return parseTodo({ ...row, subtasks_count: 0 })
}
