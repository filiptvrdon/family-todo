'use client'

import { useMemo } from 'react'
import { useTodoStore } from '@/stores/todo-store'
import { Progress } from '@/components/ui/progress'
import { START_MESSAGES, IN_PROGRESS_MESSAGES, DONE_MESSAGES } from '@/constants/messages'

interface Props {
  todoId: string
  initialCount?: number
}

export function SubtaskProgressBar({ todoId, initialCount }: Props) {
  const myTodos = useTodoStore(s => s.myTodos)
  const partnerTodos = useTodoStore(s => s.partnerTodos)

  const subtaskTotals = useMemo(() => {
    const subtasks = [...myTodos, ...partnerTodos].filter(t => t.parent_id === todoId)
    if (subtasks.length === 0) return null
    return {
      total: subtasks.length,
      completed: subtasks.filter(t => t.completed).length
    }
  }, [myTodos, partnerTodos, todoId])

  const totalSub = useMemo(() => {
    if (subtaskTotals) return subtaskTotals.total
    if (typeof initialCount === 'number') return initialCount
    return 0
  }, [subtaskTotals, initialCount])
  const completedSub = useMemo(() => subtaskTotals?.completed ?? 0, [subtaskTotals?.completed])
  const subProgress = useMemo(() => (totalSub > 0 ? (completedSub / totalSub) * 100 : 0), [completedSub, totalSub])

  const encouragement = useMemo(() => {
    if (!subtaskTotals || totalSub === 0) return null
    const index = todoId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    if (completedSub === 0) return START_MESSAGES[index % START_MESSAGES.length]
    if (completedSub < totalSub) return IN_PROGRESS_MESSAGES[index % IN_PROGRESS_MESSAGES.length]
    return DONE_MESSAGES[index % DONE_MESSAGES.length]
  }, [subtaskTotals, completedSub, totalSub, todoId])

  if (totalSub <= 0) return null

  return (
    <div className="mt-1">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span className="font-semibold">{completedSub}/{totalSub}</span>
        {encouragement && <span className="italic">{encouragement}</span>}
      </div>
      <Progress value={subProgress} className="mt-0.5" />
    </div>
  )
}
