import { create } from 'zustand'
import { Quest } from '@/lib/types'
import {
  initLocalDb,
  localDbGetAll,
  localDbUpsert,
  localDbUpsertLocal,
  localDbUpsertMany,
  localDbSoftDelete,
  localDbSoftDeleteQuestTask,
  localDbHardDelete,
  persistLocalDb,
  isOfflineError,
} from '@/lib/local-db'

interface QuestStore {
  quests: Quest[]
  loading: boolean
  addQuest: (quest: Omit<Quest, 'id' | 'created_at' | 'momentum' | 'day_start_momentum' | 'last_momentum_increase' | 'last_momentum_decay' | 'last_momentum_nudge' | 'motivation_nudge'>) => Promise<void>
  updateQuest: (id: string, patch: Partial<Quest>) => Promise<void>
  deleteQuest: (id: string) => Promise<void>
  linkTask: (questId: string, taskId: string) => Promise<void>
  unlinkTask: (questId: string, taskId: string) => Promise<void>
  subscribe: (userId: string) => () => void
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, options)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const useQuestStore = create<QuestStore>((set, get) => ({
  quests: [],
  loading: true,

  addQuest: async (quest) => {
    const id = crypto.randomUUID()
    const optimistic = {
      ...quest,
      id,
      created_at: new Date().toISOString(),
      momentum: 0,
      day_start_momentum: 0,
      last_momentum_increase: new Date().toISOString(),
      last_momentum_decay: null,
      last_momentum_nudge: null,
      motivation_nudge: null,
    } as Quest
    set(s => ({ quests: [optimistic, ...s.quests] }))
    localDbUpsertLocal('quests', optimistic as unknown as Record<string, unknown>)
    void persistLocalDb()

    try {
      const created = await apiFetch('/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...quest, id }),
      })
      localDbUpsert('quests', created)
      void persistLocalDb()
      set(s => ({ quests: s.quests.map(q => q.id === id ? created : q) }))
    } catch (err) {
      console.error('Failed to add quest:', err)
      if (!isOfflineError(err)) {
        localDbHardDelete('quests', id)
        void persistLocalDb()
        set(s => ({ quests: s.quests.filter(q => q.id !== id) }))
      }
    }
  },

  updateQuest: async (id, patch) => {
    const prev = get().quests.find(q => q.id === id)
    set(s => ({ quests: s.quests.map(q => q.id === id ? { ...q, ...patch } : q) }))
    localDbUpsertLocal('quests', { ...prev, ...patch } as Record<string, unknown>)
    void persistLocalDb()

    try {
      const result = await apiFetch(`/api/quests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      localDbUpsert('quests', result)
      void persistLocalDb()
    } catch (err) {
      console.error('Failed to update quest:', err)
      if (!isOfflineError(err) && prev) {
        set(s => ({ quests: s.quests.map(q => q.id === id ? prev : q) }))
        localDbUpsert('quests', prev as unknown as Record<string, unknown>)
        void persistLocalDb()
      }
    }
  },

  deleteQuest: async (id) => {
    const prev = get().quests.find(q => q.id === id)
    set(s => ({ quests: s.quests.filter(q => q.id !== id) }))
    localDbSoftDelete('quests', id)
    void persistLocalDb()

    try {
      await apiFetch(`/api/quests/${id}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to delete quest:', err)
      if (!isOfflineError(err) && prev) {
        set(s => ({ quests: [...s.quests, prev] }))
        localDbUpsert('quests', prev as unknown as Record<string, unknown>)
        void persistLocalDb()
      }
    }
  },

  linkTask: async (questId, taskId) => {
    localDbUpsert('quest_tasks', {
      quest_id: questId,
      task_id: taskId,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    void persistLocalDb()
    await apiFetch(`/api/quests/${questId}/tasks/${taskId}`, { method: 'PUT' })
  },

  unlinkTask: async (questId, taskId) => {
    localDbSoftDeleteQuestTask(questId, taskId)
    void persistLocalDb()
    await apiFetch(`/api/quests/${questId}/tasks/${taskId}`, { method: 'DELETE' })
  },

  subscribe: (userId) => {
    const loadFromLocal = () => {
      const local = localDbGetAll<Quest>('quests')
      if (local.length === 0) return
      const mine = local
        .filter(q => q.user_id === userId)
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
      set({ quests: mine, loading: false })
    }

    const load = async () => {
      await initLocalDb()
      loadFromLocal()

      try {
        const quests = await apiFetch('/api/quests')
        set({ quests, loading: false })
        localDbUpsertMany('quests', quests)
        void persistLocalDb()
      } catch (err) {
        console.error('[quest-store] refetch failed:', err)
        const local = localDbGetAll<Quest>('quests')
        if (local.length === 0) set({ loading: false })
      }
    }

    load()

    const onSync = () => loadFromLocal()
    window.addEventListener('sync-done', onSync)
    return () => window.removeEventListener('sync-done', onSync)
  },
}))
