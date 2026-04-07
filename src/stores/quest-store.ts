import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import * as questService from '@/services/quest-service'
import { Quest } from '@/lib/types'

const supabase = createClient()

interface QuestStore {
  quests: Quest[]
  loading: boolean
  // Mutations
  addQuest: (quest: Omit<Quest, 'id' | 'created_at' | 'momentum' | 'day_start_momentum' | 'last_momentum_increase' | 'last_momentum_decay' | 'last_momentum_nudge' | 'motivation_nudge'>) => Promise<void>
  updateQuest: (id: string, patch: Partial<Quest>) => Promise<void>
  deleteQuest: (id: string) => Promise<void>
  linkTask: (questId: string, taskId: string) => Promise<void>
  unlinkTask: (questId: string, taskId: string) => Promise<void>
  // Realtime lifecycle
  subscribe: (userId: string) => () => void
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
      status: 'active',
      pinned: false
    } as Quest
    
    set(s => ({ quests: [optimistic, ...s.quests] }))
    
    try {
      const created = await questService.createQuest(supabase, quest)
      set(s => ({ 
        quests: s.quests.map(q => q.id === tempId ? created : q) 
      }))
    } catch (err: any) {
      console.error('Failed to add quest:', err.message || err)
      set(s => ({ 
        quests: s.quests.filter(q => q.id !== tempId) 
      }))
    }
  },

  updateQuest: async (id, patch) => {
    const prev = get().quests.find(q => q.id === id)
    set(s => ({
      quests: s.quests.map(q => q.id === id ? { ...q, ...patch } : q)
    }))

    try {
      await questService.updateQuest(supabase, id, patch)
    } catch (err: any) {
      console.error('Failed to update quest:', err.message || err)
      if (prev) {
        set(s => ({
          quests: s.quests.map(q => q.id === id ? prev : q)
        }))
      }
    }
  },

  deleteQuest: async (id) => {
    const prev = get().quests.find(q => q.id === id)
    set(s => ({
      quests: s.quests.filter(q => q.id !== id)
    }))

    try {
      await questService.deleteQuest(supabase, id)
    } catch (err: any) {
      console.error('Failed to delete quest:', err.message || err)
      if (prev) {
        set(s => ({
          quests: [...s.quests, prev]
        }))
      }
    }
  },

  linkTask: async (questId, taskId) => {
    await questService.linkTask(supabase, questId, taskId)
  },

  unlinkTask: async (questId, taskId) => {
    await questService.unlinkTask(supabase, questId, taskId)
  },

  subscribe: (userId) => {
    const refetch = async () => {
      const quests = await questService.fetchQuests(supabase, userId)
      set({ quests, loading: false })
    }

    const channel = supabase
      .channel('quests-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quests', filter: `user_id=eq.${userId}` },
        ({ eventType, new: record, old }) => {
          set(s => {
            const quests = s.quests
            if (eventType === 'INSERT') return { quests: [record as Quest, ...quests] }
            if (eventType === 'UPDATE') return { quests: quests.map(q => q.id === record.id ? { ...q, ...(record as Quest) } : q) }
            if (eventType === 'DELETE') return { quests: quests.filter(q => q.id !== old.id) }
            return s
          })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          refetch()
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  },
}))
