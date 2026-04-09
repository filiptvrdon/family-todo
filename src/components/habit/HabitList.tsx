'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Habit } from '@/lib/types'
import { useHabitStore } from '@/stores/habit-store'
import HabitCard from './HabitCard'
import HabitForm from './HabitForm'

interface HabitListProps {
  userId: string
}

export default function HabitList({ userId }: HabitListProps) {
  const { myHabits, loading, subscribe, deleteHabit } = useHabitStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editHabit, setEditHabit] = useState<Habit | null>(null)

  useEffect(() => {
    const unsub = subscribe(userId)
    return unsub
  }, [userId, subscribe])

  function openCreate() {
    setEditHabit(null)
    setFormOpen(true)
  }

  function openEdit(habit: Habit) {
    setEditHabit(habit)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Habits
        </h2>
        <button
          onClick={openCreate}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
          style={{ background: 'var(--color-foam)', color: 'var(--color-primary)' }}
          aria-label="Add habit"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {loading && myHabits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-5 h-5 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
          </div>
        )}

        {!loading && myHabits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
            <span className="text-3xl">✦</span>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              No habits yet
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Small things, done consistently. Add your first habit to get started.
            </p>
            <button
              onClick={openCreate}
              className="mt-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ background: 'var(--color-primary)', color: 'white' }}
            >
              Add a habit
            </button>
          </div>
        )}

        <AnimatePresence initial={false}>
          {myHabits.map(habit => (
            <motion.div
              key={habit.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <HabitCard
                habit={habit}
                userId={userId}
                onEdit={openEdit}
                onDelete={deleteHabit}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Form drawer */}
      <HabitForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        userId={userId}
        editHabit={editHabit}
      />
    </div>
  )
}
