'use client'

import { motion } from 'framer-motion'
import { Calendar } from 'lucide-react'
import { format, parseISO, startOfDay, isBefore, isValid } from 'date-fns'
import { QuestIcon } from '@/lib/questIcons'
import { Todo, QuestLink } from '@/lib/types'

interface Props {
  todo: Todo
  quests?: QuestLink[]
}

export function TodoMetadata({ todo, quests }: Props) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      {quests && quests.length > 0 && (
        <div className="flex items-center gap-1">
          {quests.slice(0, 3).map((q, i) => (
            <motion.span
              key={q.name}
              title={q.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: q.status === 'completed' ? 0.5 : 1, scale: 1 }}
              transition={{ duration: 0.2, delay: i * 0.05, ease: 'easeOut' }}
              style={{
                color: q.status === 'completed' ? 'var(--color-text-disabled)' : 'var(--color-primary)',
                display: 'inline-flex',
              }}
            >
              <QuestIcon name={q.icon} size={13} />
            </motion.span>
          ))}
        </div>
      )}
      {todo.energy_level && todo.energy_level !== 'low' && (
        <span 
          className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: 'var(--color-foam)', color: 'var(--color-text-secondary)' }}
        >
          {todo.energy_level}
        </span>
      )}
      {todo.recurrence && (
        <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-foam)', color: 'var(--color-accent)' }}>
          {todo.recurrence.charAt(0).toUpperCase() + todo.recurrence.slice(1)}
        </span>
      )}
      {todo.due_date && (() => {
        const date = parseISO(todo.due_date)
        if (!isValid(date)) return null

        const isOverdue = !todo.completed && isBefore(date, startOfDay(new Date()))
        return (
          <span
            className="flex items-center gap-1 text-xs"
            style={{ color: isOverdue ? 'var(--color-destructive)' : 'var(--color-text-disabled)' }}
          >
            <Calendar size={11} />
            {format(date, 'MMM d')}
          </span>
        )
      })()}
    </div>
  )
}
