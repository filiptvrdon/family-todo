import { create } from 'zustand'
import { User } from '@/lib/types'

interface UserStore {
  user: User | null
  partner: User | null
  loading: boolean
  updateUser: (id: string, patch: Partial<User>) => Promise<void>
  subscribe: (userId: string, partnerId: string | null) => () => void
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, options)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  partner: null,
  loading: true,

  updateUser: async (id, patch) => {
    const isMe = get().user?.id === id
    const key = isMe ? 'user' : 'partner'
    const prev = isMe ? get().user : get().partner

    set(s => ({
      [key]: s[key as keyof typeof s] ? { ...(s[key as keyof typeof s] as User), ...patch } : null
    }))

    try {
      await apiFetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } catch (err) {
      console.error('Failed to update user:', err)
      set({ [key]: prev })
    }
  },

  subscribe: (_userId, _partnerId) => {
    const refetch = async () => {
      try {
        const { user, partner } = await apiFetch('/api/users/me')
        set({ user, partner, loading: false })
      } catch (err) {
        console.error('[user-store] refetch failed:', err)
        set({ loading: false })
      }
    }

    refetch()

    return () => {}
  },
}))
