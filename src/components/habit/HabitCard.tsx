'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Check } from 'lucide-react'
import { Habit } from '@/lib/types'
import { useHabitStore } from '@/stores/habit-store'
import { Progress } from '@/components/ui/progress'
import { format } from 'date-fns'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatProgress(habit: Habit, total: number): string {
  if (habit.value_type === 'time') {
    const current = formatMinutes(total)
    const goal = habit.goal_value ? formatMinutes(habit.goal_value) : null
    return goal ? `${current} / ${goal}` : current
  }
  const unit = habit.unit_label ? ` ${habit.unit_label}` : ''
  const goal = habit.goal_value
  return goal !== null ? `${total} / ${goal}${unit}` : `${total}${unit}`
}

// ── Count long-press popover ──────────────────────────────────────────────────

interface CountPopoverProps {
  unitLabel: string | null
  onLog: (v: number) => void
  onClose: () => void
}

function CountPopover({ unitLabel, onLog, onClose }: CountPopoverProps) {
  const [val, setVal] = useState('')
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.12 }}
      className="absolute right-0 top-full mt-1 z-10 rounded-xl p-2.5 shadow-lg flex items-center gap-2"
      style={{ background: 'var(--card)', border: '1px solid var(--border)', minWidth: 140 }}
    >
      <input
        autoFocus type="number" min={1} placeholder={unitLabel ?? 'count'} value={val}
        onChange={e => setVal(e.target.value)}
        className="flex-1 px-2 py-1 rounded-lg text-xs border outline-none"
        style={{ background: 'var(--background)', color: 'var(--color-text)', borderColor: 'var(--border)' }}
        onKeyDown={e => {
          if (e.key === 'Enter' && val) { const v = parseInt(val); if (v > 0) { onLog(v); onClose() } }
          if (e.key === 'Escape') onClose()
        }}
      />
      <button
        disabled={!val || parseInt(val) <= 0}
        onClick={() => { const v = parseInt(val); if (v > 0) { onLog(v); onClose() } }}
        className="px-2 py-1 rounded-lg text-xs font-medium disabled:opacity-40"
        style={{ background: 'var(--color-primary)', color: 'white' }}
      >+</button>
    </motion.div>
  )
}

// ── HabitCard ─────────────────────────────────────────────────────────────────

interface HabitCardProps {
  habit: Habit
  userId: string
  onEdit: (habit: Habit) => void
  dayDate: Date
}

export default function HabitCard({ habit, userId, onEdit, dayDate }: HabitCardProps) {
  const { logEntry, removeLastEntry, dateEntries, periodTotal } = useHabitStore()

  const dateStr = format(dayDate, 'yyyy-MM-dd')
  const dayEnts = dateEntries(habit.id, dateStr)
  const total = periodTotal(habit.id, dateStr)
  const atGoal = habit.goal_value !== null && total >= habit.goal_value
  const booleanDone = habit.value_type === 'boolean' && dayEnts.some(e => e.value === 1)
  const completed = atGoal || (booleanDone && habit.goal_period === 'daily')

  const [showCountPopover, setShowCountPopover] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)

  function startLongPress() {
    didLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      setShowCountPopover(true)
    }, 500)
  }
  function cancelLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  function handlePlusClick() {
    if (didLongPress.current) return
    if (habit.value_type === 'count') {
      logEntry({ habit_id: habit.id, user_id: userId, value: 1, period_date: dateStr, note: null })
    } else {
      // time / freeform: open the detail form for logging
      onEdit(habit)
    }
  }

  function handleBooleanToggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (booleanDone) removeLastEntry(habit.id, dateStr)
    else logEntry({ habit_id: habit.id, user_id: userId, value: 1, period_date: dateStr, note: null })
  }

  function handleMinus(e: React.MouseEvent) {
    e.stopPropagation()
    if (total <= 0) return
    removeLastEntry(habit.id, dateStr)
  }

  const progressPct = habit.goal_value && habit.value_type !== 'boolean'
    ? Math.min(100, Math.round((total / habit.goal_value) * 100))
    : null

  return (
    <motion.div
      layout
      className="relative rounded-2xl overflow-hidden transition-colors cursor-pointer"
      style={{
        background: completed
          ? 'color-mix(in srgb, var(--color-completion) 8%, var(--card))'
          : 'var(--card)',
        boxShadow: 'var(--shadow-card)',
        border: completed
          ? '1px solid color-mix(in srgb, var(--color-completion) 30%, transparent)'
          : '1px solid var(--border)',
      }}
      onClick={() => onEdit(habit)}
    >
      {/* ── Main row ── */}
      <div className="flex items-center gap-2 px-3" style={{ minHeight: 44 }}>
        {/* Icon */}
        {habit.icon && <span className="text-base shrink-0 leading-none">{habit.icon}</span>}

        {/* Title + progress bar */}
        <div className="flex-1 min-w-0 py-2">
          <div className="flex items-center gap-2">
            <span
              className="text-sm truncate"
              style={{ color: completed ? 'var(--color-completion)' : 'var(--color-text)', fontWeight: 450 }}
            >
              {habit.title}
            </span>
            {/* Progress label pill */}
            {habit.value_type !== 'boolean' && (total > 0 || habit.goal_value !== null) && (
              <span
                className="shrink-0 text-[11px] tabular-nums font-medium px-1.5 py-0.5 rounded-md"
                style={{
                  background: completed ? 'color-mix(in srgb, var(--color-completion) 15%, transparent)' : 'var(--color-foam)',
                  color: completed ? 'var(--color-completion)' : 'var(--color-text-secondary)',
                }}
              >
                {formatProgress(habit, total)}
              </span>
            )}
          </div>
          {progressPct !== null && (
            <Progress
              value={progressPct}
              fillColor={completed ? 'var(--color-completion)' : undefined}
              className="mt-1"
            />
          )}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {habit.value_type === 'boolean' ? (
            <button
              onClick={handleBooleanToggle}
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
              style={{
                background: booleanDone ? 'var(--color-completion)' : 'var(--color-foam)',
                border: booleanDone ? 'none' : '1.5px solid var(--color-primary-light)',
              }}
              aria-label={booleanDone ? 'Undo' : 'Mark done'}
            >
              {booleanDone
                ? <Check size={13} strokeWidth={2.5} color="white" />
                : <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: 'var(--color-primary)' }} />
              }
            </button>
          ) : (
            <>
              <button
                onClick={handleMinus}
                disabled={total <= 0}
                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all disabled:opacity-25"
                style={{ background: 'var(--color-foam)', color: 'var(--color-primary)' }}
                aria-label="Remove last entry"
              >
                <Minus size={13} />
              </button>

              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); handlePlusClick() }}
                  onMouseDown={habit.value_type === 'count' ? startLongPress : undefined}
                  onMouseUp={habit.value_type === 'count' ? cancelLongPress : undefined}
                  onMouseLeave={habit.value_type === 'count' ? cancelLongPress : undefined}
                  onTouchStart={habit.value_type === 'count' ? startLongPress : undefined}
                  onTouchEnd={habit.value_type === 'count' ? cancelLongPress : undefined}
                  className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
                  style={{ background: completed ? 'var(--color-completion)' : 'var(--color-primary)', color: 'white' }}
                  aria-label="Add entry"
                >
                  <Plus size={13} />
                </button>
                <AnimatePresence>
                  {showCountPopover && (
                    <CountPopover
                      unitLabel={habit.unit_label}
                      onLog={v => logEntry({ habit_id: habit.id, user_id: userId, value: v, period_date: dateStr, note: null })}
                      onClose={() => setShowCountPopover(false)}
                    />
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

        </div>
      </div>
    </motion.div>
  )
}
