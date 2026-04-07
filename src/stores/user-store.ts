import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import * as userService from '@/services/user-service'
import { User } from '@/lib/types'

const supabase = createClient()

interface UserStore {
  user: User | null
  partner: User | null
  loading: boolean
  // Mutations
  updateUser: (id: string, patch: Partial<User>) => Promise<void>
  // Realtime lifecycle
  subscribe: (userId: string, partnerId: string | null) => () => void
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  partner: null,
  loading: true,

  updateUser: async (id, patch) => {
    const isMe = get().user?.id === id
    const prev = isMe ? get().user : get().partner

    set(s => {
      const key = isMe ? 'user' : 'partner'
      const current = s[key]
      return {
        [key]: current ? { ...current, ...patch } : null
      }
    })

    try {
      await userService.updateUser(supabase, id, patch)
    } catch (err) {
      console.error('Failed to update user:', err)
      const key = isMe ? 'user' : 'partner'
      set({ [key]: prev })
    }
  },

  subscribe: (userId, partnerId) => {
    const refetch = async () => {
      const [user, partner] = await Promise.all([
        userService.fetchUser(supabase, userId),
        partnerId ? userService.fetchPartner(supabase, partnerId) : Promise.resolve(null),
      ])
      set({ user, partner, loading: false })
    }

    const channel = supabase
      .channel('users-all')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        ({ new: record }) => {
          set({ user: record as User })
        }
      )

    if (partnerId) {
      channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${partnerId}` },
        ({ new: record }) => {
          set({ partner: record as User })
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
