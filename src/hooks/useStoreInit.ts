'use client'

import { useEffect } from 'react'
import { useTodoStore } from '@/stores/todo-store'
import { useQuestStore } from '@/stores/quest-store'
import { useUserStore } from '@/stores/user-store'
import { useEventStore } from '@/stores/event-store'
import { User } from '@/lib/types'

export function useStoreInit({ user }: { user: User | null }) {
  const subscribeTodos = useTodoStore(s => s.subscribe)
  const subscribeQuests = useQuestStore(s => s.subscribe)
  const subscribeUser = useUserStore(s => s.subscribe)
  const subscribeEvents = useEventStore(s => s.subscribe)

  const userId = user?.id ?? null
  const partnerId = user?.partner_id ?? null

  useEffect(() => {
    if (!userId) return

    const unsubTodos = subscribeTodos(userId, partnerId)
    const unsubQuests = subscribeQuests(userId)
    const unsubUser = subscribeUser(userId, partnerId)
    const unsubEvents = subscribeEvents(userId, partnerId)

    return () => {
      unsubTodos()
      unsubQuests()
      unsubUser()
      unsubEvents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, partnerId])
}
