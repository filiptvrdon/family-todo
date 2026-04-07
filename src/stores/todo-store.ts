import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import * as todoService from '@/services/todo-service'
import * as questService from '@/services/quest-service'
import { Todo } from '@/lib/types'

const supabase = createClient()

interface TodoStore {
  myTodos: Todo[]
  partnerTodos: Todo[]
  loading: boolean
  // Mutations
  toggleTodo: (id: string, completed: boolean) => Promise<void>
  addTodo: (todo: Omit<Todo, 'id' | 'created_at'>) => Promise<void>
  updateTodo: (id: string, patch: Partial<Todo>) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  // Realtime lifecycle
  subscribe: (userId: string, partnerId: string | null) => () => void
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  myTodos: [],
  partnerTodos: [],
  loading: true,

  toggleTodo: async (id, completed) => {
    const isMine = get().myTodos.some(t => t.id === id)
    
    // 1. Optimistic update
    set(s => {
      const key = isMine ? 'myTodos' : 'partnerTodos'
      return {
        [key]: s[key].map(t => t.id === id ? { ...t, completed } : t)
      }
    })

    // 2. Persist
    try {
      await todoService.toggleTodo(supabase, id, completed)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Failed to toggle todo:', message)
      // Rollback
      set(s => {
        const key = isMine ? 'myTodos' : 'partnerTodos'
        return {
          [key]: s[key].map(t => t.id === id ? { ...t, completed: !completed } : t)
        }
      })
    }
  },

  addTodo: async (todo) => {
    const tempId = `temp-${Date.now()}`
    const optimistic = { 
      ...todo, 
      id: tempId, 
      created_at: new Date().toISOString() 
    } as Todo
    
    set(s => ({ myTodos: [...s.myTodos, optimistic] }))
    
    try {
      const created = await todoService.createTodo(supabase, todo)
      // Replace temp with real record
      set(s => ({ 
        myTodos: s.myTodos.map(t => t.id === tempId ? created : t) 
      }))

      // Sync quest links from parent if applicable
      if (todo.parent_id) {
        try {
          const questIds = await questService.fetchQuestsForTask(supabase, todo.parent_id)
          if (questIds.length > 0) {
            await Promise.all(questIds.map(qid => questService.linkTask(supabase, qid, created.id)))
          }
        } catch (err) {
          console.error('Failed to sync quest links for subtask:', err)
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Failed to add todo:', message)
      // Rollback
      set(s => ({ 
        myTodos: s.myTodos.filter(t => t.id !== tempId) 
      }))
    }
  },

  updateTodo: async (id, patch) => {
    const isMine = get().myTodos.some(t => t.id === id)
    const prev = (isMine ? get().myTodos : get().partnerTodos).find(t => t.id === id)

    set(s => {
      const key = isMine ? 'myTodos' : 'partnerTodos'
      return {
        [key]: s[key].map(t => t.id === id ? { ...t, ...patch } : t)
      }
    })

    try {
      await todoService.updateTodo(supabase, id, patch)
      
      // Sync quest links from parent if parent_id was newly set/changed
      if (patch.parent_id) {
        try {
          const questIds = await questService.fetchQuestsForTask(supabase, patch.parent_id)
          if (questIds.length > 0) {
            await Promise.all(questIds.map(qid => questService.linkTask(supabase, qid, id)))
          }
        } catch (err) {
          console.error('Failed to sync quest links for task moved to parent:', err)
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Failed to update todo:', message)
      if (prev) {
        set(s => {
          const key = isMine ? 'myTodos' : 'partnerTodos'
          return {
            [key]: s[key].map(t => t.id === id ? prev : t)
          }
        })
      }
    }
  },

  deleteTodo: async (id) => {
    const isMine = get().myTodos.some(t => t.id === id)
    const prev = (isMine ? get().myTodos : get().partnerTodos).find(t => t.id === id)

    set(s => {
      const key = isMine ? 'myTodos' : 'partnerTodos'
      return {
        [key]: s[key].filter(t => t.id !== id)
      }
    })

    try {
      await todoService.deleteTodo(supabase, id)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Failed to delete todo:', message)
      if (prev) {
        set(s => {
          const key = isMine ? 'myTodos' : 'partnerTodos'
          return {
            [key]: [...s[key], prev]
          }
        })
      }
    }
  },

  subscribe: (userId, partnerId) => {
    const refetch = async () => {
      const [mine, theirs] = await Promise.all([
        todoService.fetchTodos(supabase, userId),
        partnerId ? todoService.fetchTodos(supabase, partnerId) : Promise.resolve([]),
      ])
      set({ myTodos: mine, partnerTodos: theirs, loading: false })
    }

    const channel = supabase
      .channel('todos-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos', filter: `user_id=eq.${userId}` },
        ({ eventType, new: record, old }) => {
          set(s => {
            const todos = s.myTodos
            if (eventType === 'INSERT') return { myTodos: [...todos, record as Todo] }
            if (eventType === 'UPDATE') return { myTodos: todos.map(t => t.id === record.id ? { ...t, ...(record as Todo) } : t) }
            if (eventType === 'DELETE') return { myTodos: todos.filter(t => t.id !== old.id) }
            return s
          })
        }
      )

    if (partnerId) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos', filter: `user_id=eq.${partnerId}` },
        ({ eventType, new: record, old }) => {
          set(s => {
            const todos = s.partnerTodos
            if (eventType === 'INSERT') return { partnerTodos: [...todos, record as Todo] }
            if (eventType === 'UPDATE') return { partnerTodos: todos.map(t => t.id === record.id ? { ...t, ...(record as Todo) } : t) }
            if (eventType === 'DELETE') return { partnerTodos: todos.filter(t => t.id !== old.id) }
            return s
          })
        }
      )
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        refetch()
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  },
}))
