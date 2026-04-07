'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { START_MESSAGES, IN_PROGRESS_MESSAGES, DONE_MESSAGES } from '@/constants/messages'

interface Props {
  todoId: string
  initialCount?: number
}

export function SubtaskProgressBar({ todoId, initialCount }: Props) {
  const supabase = createClient()
  const [subtaskTotals, setSubtaskTotals] = useState<{ total: number; completed: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchCounts() {
      if (!initialCount || initialCount <= 0) return
      const { data } = await supabase
        .from('todos')
        .select('id, completed')
        .eq('parent_id', todoId)
      if (!cancelled && data) {
        const total = data.length
        const completed = data.filter(d => d.completed).length
        setSubtaskTotals({ total, completed })
      }
    }
    fetchCounts()
    return () => { cancelled = true }
  }, [supabase, todoId, initialCount])

  const totalSub = useMemo(() => subtaskTotals?.total ?? (initialCount ?? 0), [subtaskTotals?.total, initialCount])
  const completedSub = useMemo(() => subtaskTotals?.completed ?? 0, [subtaskTotals?.completed])
  const subProgress = useMemo(() => (totalSub > 0 ? (completedSub / totalSub) * 100 : 0), [completedSub, totalSub])

  const encouragement = useMemo(() => {
    if (!subtaskTotals || totalSub === 0) return null
    const index = todoId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    if (completedSub === 0) return START_MESSAGES[index % START_MESSAGES.length]
    if (completedSub < totalSub) return IN_PROGRESS_MESSAGES[index % IN_PROGRESS_MESSAGES.length]
    return DONE_MESSAGES[index % DONE_MESSAGES.length]
  }, [subtaskTotals, completedSub, totalSub, todoId])

  if (!initialCount || initialCount <= 0 || !subtaskTotals) return null

  return (
    <div className="mt-1">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span className="font-semibold">{completedSub}/{totalSub}</span>
        {encouragement && <span className="italic">{encouragement}</span>}
      </div>
      <div className="h-1 w-full bg-foam rounded-full overflow-hidden mt-0.5 relative">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${subProgress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        <motion.div
          className="absolute top-0 bottom-0 bg-white/30 w-2 blur-[1px]"
          animate={{ left: `${subProgress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}
