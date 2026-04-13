import { create } from 'zustand'
import { User } from '@/lib/types'
import {
  initLocalDb,
  localDbGetAll,
  localDbUpsert,
  persistLocalDb,
  isOfflineError,
} from '@/lib/local-db'

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
    localDbUpsert('users', { ...prev, ...patch } as unknown as Record<string, unknown>)
    void persistLocalDb()

    try {
      await apiFetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } catch (err) {
      console.error('Failed to update user:', err)
      if (!isOfflineError(err)) {
        set({ [key]: prev })
        if (prev) {
          localDbUpsert('users', prev as unknown as Record<string, unknown>)
          void persistLocalDb()
        }
      }
    }
  },

  subscribe: (userId, partnerId) => {
    const load = async () => {
      await initLocalDb()

      // Step 1: serve from local DB immediately
      const local = localDbGetAll<User>('users')
      const localUser = local.find(u => u.id === userId) ?? null
      const localPartner = partnerId ? (local.find(u => u.id === partnerId) ?? null) : null
      if (localUser) {
        set({ user: localUser, partner: localPartner, loading: false })
      }

      // Step 2: background fetch from server
      try {
        const { user, partner } = await apiFetch('/api/users/me')
        if (user) localDbUpsert('users', user as unknown as Record<string, unknown>)
        if (partner) localDbUpsert('users', partner as unknown as Record<string, unknown>)
        void persistLocalDb()
        set({ user, partner, loading: false })
      } catch (err) {
        console.error('[user-store] refetch failed:', err)
        if (!localUser) set({ loading: false })
      }
    }

    load()
    return () => {}
  },
}))
