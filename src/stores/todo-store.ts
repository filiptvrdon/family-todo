import { create } from 'zustand'
import { Todo } from '@/lib/types'

interface TodoStore {
  myTodos: Todo[]
  partnerTodos: Todo[]
  loading: boolean
  toggleTodo: (id: string, completed: boolean) => Promise<void>
  addTodo: (todo: Omit<Todo, 'id' | 'created_at'>) => Promise<void>
  updateTodo: (id: string, patch: Partial<Todo>) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  subscribe: (userId: string, partnerId: string | null) => () => void
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, options)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  myTodos: [],
  partnerTodos: [],
  loading: true,

  toggleTodo: async (id, completed) => {
    const isMine = get().myTodos.some(t => t.id === id)
    const key = isMine ? 'myTodos' : 'partnerTodos'

    // Optimistic
    set(s => ({
      [key]: (s[key as keyof typeof s] as Todo[]).map(t =>
        t.id === id ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null } : t
      )
    }))

    try {
      await apiFetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed, completed_at: completed ? new Date().toISOString() : null }),
      })
    } catch (err) {
      console.error('Failed to toggle todo:', err)
      // Rollback
      set(s => ({
        [key]: (s[key as keyof typeof s] as Todo[]).map(t =>
          t.id === id ? { ...t, completed: !completed } : t
        )
      }))
    }
  },

  addTodo: async (todo) => {
    const tempId = `temp-${Date.now()}`
    const optimistic = { ...todo, id: tempId, created_at: new Date().toISOString() } as Todo
    set(s => ({ myTodos: [...s.myTodos, optimistic] }))

    try {
      const created = await apiFetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(todo),
      })
      set(s => ({ myTodos: s.myTodos.map(t => t.id === tempId ? created : t) }))
    } catch (err) {
      console.error('Failed to add todo:', err)
      set(s => ({ myTodos: s.myTodos.filter(t => t.id !== tempId) }))
    }
  },

  updateTodo: async (id, patch) => {
    const isMine = get().myTodos.some(t => t.id === id)
    const key = isMine ? 'myTodos' : 'partnerTodos'
    const prev = (get()[key as keyof ReturnType<typeof get>] as Todo[]).find(t => t.id === id)

    set(s => ({
      [key]: (s[key as keyof typeof s] as Todo[]).map(t => t.id === id ? { ...t, ...patch } : t)
    }))

    try {
      await apiFetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } catch (err) {
      console.error('Failed to update todo:', err)
      if (prev) {
        set(s => ({
          [key]: (s[key as keyof typeof s] as Todo[]).map(t => t.id === id ? prev : t)
        }))
      }
    }
  },

  deleteTodo: async (id) => {
    const isMine = get().myTodos.some(t => t.id === id)
    const key = isMine ? 'myTodos' : 'partnerTodos'
    const prev = (get()[key as keyof ReturnType<typeof get>] as Todo[]).find(t => t.id === id)

    set(s => ({
      [key]: (s[key as keyof typeof s] as Todo[]).filter(t => t.id !== id)
    }))

    try {
      await apiFetch(`/api/todos/${id}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to delete todo:', err)
      if (prev) {
        set(s => ({
          [key]: [...(s[key as keyof typeof s] as Todo[]), prev]
        }))
      }
    }
  },

  subscribe: (_userId, _partnerId) => {
    const refetch = async () => {
      try {
        const { mine, theirs } = await apiFetch('/api/todos')
        set({ myTodos: mine, partnerTodos: theirs, loading: false })
      } catch (err) {
        console.error('[todo-store] refetch failed:', err)
        set({ loading: false })
      }
    }

    refetch()

    return () => {}
  },
}))
