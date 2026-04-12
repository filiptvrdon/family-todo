import { create } from 'zustand'
import { Quest } from '@/lib/types'

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
    const tempId = `temp-${Date.now()}`
    const optimistic = {
      ...quest,
      id: tempId,
      created_at: new Date().toISOString(),
      momentum: 0,
      day_start_momentum: 0,
      last_momentum_increase: new Date().toISOString(),
      last_momentum_decay: null,
      last_momentum_nudge: null,
      motivation_nudge: null,
    } as Quest
    set(s => ({ quests: [optimistic, ...s.quests] }))

    try {
      const created = await apiFetch('/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quest),
      })
      set(s => ({ quests: s.quests.map(q => q.id === tempId ? created : q) }))
    } catch (err) {
      console.error('Failed to add quest:', err)
      set(s => ({ quests: s.quests.filter(q => q.id !== tempId) }))
    }
  },

  updateQuest: async (id, patch) => {
    const prev = get().quests.find(q => q.id === id)
    set(s => ({ quests: s.quests.map(q => q.id === id ? { ...q, ...patch } : q) }))

    try {
      await apiFetch(`/api/quests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } catch (err) {
      console.error('Failed to update quest:', err)
      if (prev) set(s => ({ quests: s.quests.map(q => q.id === id ? prev : q) }))
    }
  },

  deleteQuest: async (id) => {
    const prev = get().quests.find(q => q.id === id)
    set(s => ({ quests: s.quests.filter(q => q.id !== id) }))

    try {
      await apiFetch(`/api/quests/${id}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to delete quest:', err)
      if (prev) set(s => ({ quests: [...s.quests, prev] }))
    }
  },

  linkTask: async (questId, taskId) => {
    await apiFetch(`/api/quests/${questId}/tasks/${taskId}`, { method: 'PUT' })
  },

  unlinkTask: async (questId, taskId) => {
    await apiFetch(`/api/quests/${questId}/tasks/${taskId}`, { method: 'DELETE' })
  },

  subscribe: (_userId) => {
    const refetch = async () => {
      try {
        const quests = await apiFetch('/api/quests')
        set({ quests, loading: false })
      } catch (err) {
        console.error('[quest-store] refetch failed:', err)
        set({ loading: false })
      }
    }

    refetch()

    return () => {}
  },
}))
