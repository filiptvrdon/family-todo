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

  useEffect(() => {
    if (!user) return

    const unsubTodos = subscribeTodos(user.id, user.partner_id)
    const unsubQuests = subscribeQuests(user.id)
    const unsubUser = subscribeUser(user.id, user.partner_id)
    const unsubEvents = subscribeEvents(user.id, user.partner_id)

    return () => {
      unsubTodos()
      unsubQuests()
      unsubUser()
      unsubEvents()
    }
  }, [user, subscribeTodos, subscribeQuests, subscribeUser, subscribeEvents])
}
