import { create } from 'zustand'
import { Todo } from '@/lib/types'
import {
  initLocalDb,
  localDbGetAll,
  localDbUpsert,
  localDbUpsertLocal,
  localDbUpsertMany,
  localDbSoftDelete,
  localDbHardDelete,
  persistLocalDb,
  isOfflineError,
} from '@/lib/local-db'

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

function withSubtasksCounts(todos: Todo[]): Todo[] {
  return todos.map(t => ({
    ...t,
    subtasks_count: todos.filter(s => s.parent_id === t.id).length,
  }))
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  myTodos: [],
  partnerTodos: [],
  loading: true,

  toggleTodo: async (id, completed) => {
    const isMine = get().myTodos.some(t => t.id === id)
    const key = isMine ? 'myTodos' : 'partnerTodos'
    const prev = (get()[key as keyof ReturnType<typeof get>] as Todo[]).find(t => t.id === id)

    const patch = { completed, completed_at: completed ? new Date().toISOString() : null }
    set(s => ({
      [key]: (s[key as keyof typeof s] as Todo[]).map(t => t.id === id ? { ...t, ...patch } : t)
    }))

    localDbUpsertLocal('todos', { ...prev, ...patch } as Record<string, unknown>)
    void persistLocalDb()

    try {
      const result = await apiFetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      localDbUpsert('todos', result)
      void persistLocalDb()
    } catch (err) {
      console.error('Failed to toggle todo:', err)
      if (!isOfflineError(err) && prev) {
        set(s => ({
          [key]: (s[key as keyof typeof s] as Todo[]).map(t => t.id === id ? prev : t)
        }))
        localDbUpsert('todos', prev as unknown as Record<string, unknown>)
        void persistLocalDb()
      }
    }
  },

  addTodo: async (todo) => {
    const id = crypto.randomUUID()
    const optimistic = { ...todo, id, created_at: new Date().toISOString() } as Todo
    set(s => ({ myTodos: [...s.myTodos, optimistic] }))
    localDbUpsertLocal('todos', optimistic as unknown as Record<string, unknown>)
    void persistLocalDb()

    try {
      const created = await apiFetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...todo, id }),
      })
      localDbUpsert('todos', created)
      void persistLocalDb()
      set(s => ({ myTodos: s.myTodos.map(t => t.id === id ? created : t) }))
    } catch (err) {
      console.error('Failed to add todo:', err)
      if (!isOfflineError(err)) {
        localDbHardDelete('todos', id)
        void persistLocalDb()
        set(s => ({ myTodos: s.myTodos.filter(t => t.id !== id) }))
      }
    }
  },

  updateTodo: async (id, patch) => {
    const isMine = get().myTodos.some(t => t.id === id)
    const key = isMine ? 'myTodos' : 'partnerTodos'
    const prev = (get()[key as keyof ReturnType<typeof get>] as Todo[]).find(t => t.id === id)

    set(s => ({
      [key]: (s[key as keyof typeof s] as Todo[]).map(t => t.id === id ? { ...t, ...patch } : t)
    }))
    localDbUpsertLocal('todos', { ...prev, ...patch } as Record<string, unknown>)
    void persistLocalDb()

    try {
      const result = await apiFetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      localDbUpsert('todos', result)
      void persistLocalDb()
    } catch (err) {
      console.error('Failed to update todo:', err)
      if (!isOfflineError(err) && prev) {
        set(s => ({
          [key]: (s[key as keyof typeof s] as Todo[]).map(t => t.id === id ? prev : t)
        }))
        localDbUpsert('todos', prev as unknown as Record<string, unknown>)
        void persistLocalDb()
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
    localDbSoftDelete('todos', id)
    void persistLocalDb()

    try {
      await apiFetch(`/api/todos/${id}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to delete todo:', err)
      if (!isOfflineError(err) && prev) {
        set(s => ({
          [key]: [...(s[key as keyof typeof s] as Todo[]), prev]
        }))
        localDbUpsert('todos', prev as unknown as Record<string, unknown>)
        void persistLocalDb()
      }
    }
  },

  subscribe: (userId, partnerId) => {
    const loadFromLocal = () => {
      const local = localDbGetAll<Todo>('todos')
      if (local.length === 0) return
      const mine = withSubtasksCounts(local.filter(t => t.user_id === userId))
      const theirs = partnerId
        ? withSubtasksCounts(local.filter(t => t.user_id === partnerId))
        : []
      set({ myTodos: mine, partnerTodos: theirs, loading: false })
    }

    const load = async () => {
      await initLocalDb()
      loadFromLocal()

      try {
        const { mine, theirs } = await apiFetch('/api/todos')
        localDbUpsertMany('todos', [...mine, ...(theirs ?? [])])
        void persistLocalDb()
        set({ myTodos: mine, partnerTodos: theirs ?? [], loading: false })
      } catch (err) {
        console.error('[todo-store] refetch failed:', err)
        const local = localDbGetAll<Todo>('todos')
        if (local.length === 0) set({ loading: false })
      }
    }

    load()

    const onSync = () => loadFromLocal()
    window.addEventListener('sync-done', onSync)
    return () => window.removeEventListener('sync-done', onSync)
  },
}))
