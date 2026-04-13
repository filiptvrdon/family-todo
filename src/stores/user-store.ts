import { create } from 'zustand'
import { User } from '@/lib/types'
import {
  initLocalDb,
  localDbGetAll,
  localDbUpsert,
  persistLocalDb,
  isOfflineError,
} from '@/lib/local-db'
import { startSync } from '@/lib/sync'

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
    const loadFromLocal = () => {
      const local = localDbGetAll<User>('users')
      const localUser = local.find(u => u.id === userId) ?? null
      const localPartner = partnerId ? (local.find(u => u.id === partnerId) ?? null) : null
      if (!localUser) return
      set({ user: localUser, partner: localPartner, loading: false })
    }

    const load = async () => {
      await initLocalDb()
      loadFromLocal()

      try {
        const { user, partner } = await apiFetch('/api/users/me')
        set({ user, partner, loading: false })
        if (user) localDbUpsert('users', user as unknown as Record<string, unknown>)
        if (partner) localDbUpsert('users', partner as unknown as Record<string, unknown>)
        void persistLocalDb()
      } catch (err) {
        console.error('[user-store] refetch failed:', err)
        const local = localDbGetAll<User>('users')
        if (!local.find(u => u.id === userId)) set({ loading: false })
      }
    }

    load()

    const stopSync = startSync(userId, partnerId)
    const onSync = () => loadFromLocal()
    window.addEventListener('sync-done', onSync)
    return () => {
      stopSync()
      window.removeEventListener('sync-done', onSync)
    }
  },
}))
