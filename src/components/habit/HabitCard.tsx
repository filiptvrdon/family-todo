'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Check, Trash2 } from 'lucide-react'
import { Habit, HabitTracking } from '@/lib/types'
import { useHabitStore, todayDate, weekStartDate } from '@/stores/habit-store'

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

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

// ── Boolean day-dot row (shown in expanded area) ──────────────────────────────

function BooleanWeekDots({ weekEntries }: { weekEntries: HabitTracking[] }) {
  const doneDates = new Set(weekEntries.filter(e => e.value === 1).map(e => e.period_date))
  const monday = new Date(weekStartDate())

  return (
    <div className="flex items-center gap-2 pt-2 pb-1">
      {DAY_LABELS.map((label, i) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const isToday = dateStr === todayDate()
        const isDone = doneDates.has(dateStr)
        const isFuture = dateStr > todayDate()
        return (
          <div key={dateStr} className="flex flex-col items-center gap-0.5">
            <span
              className="text-[9px] font-medium"
              style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
            >
              {label}
            </span>
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{
                background: isDone ? 'var(--color-completion)' : isFuture ? 'transparent' : 'var(--color-foam)',
                border: isToday && !isDone ? '1.5px solid var(--color-primary)' : '1.5px solid transparent',
                opacity: isFuture ? 0.3 : 1,
              }}
            >
              {isDone && <Check size={8} strokeWidth={3} color="white" />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Time chip row (shown in expanded area) ────────────────────────────────────

const TIME_CHIPS = [5, 10, 15, 30, 45, 60]

function TimeChips({ onSelect, onClose }: { onSelect: (m: number) => void; onClose: () => void }) {
  const [custom, setCustom] = useState('')
  return (
    <div className="flex flex-wrap gap-1.5 items-center pt-2 pb-1">
      {TIME_CHIPS.map(m => (
        <button
          key={m}
          onClick={() => { onSelect(m); onClose() }}
          className="px-2 py-0.5 rounded-full text-xs font-medium transition-colors"
          style={{ background: 'var(--color-foam)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-light)' }}
        >
          {m}m
        </button>
      ))}
      <div className="flex items-center gap-1">
        <input
          type="number" min={1} placeholder="other" value={custom}
          onChange={e => setCustom(e.target.value)}
          className="w-12 px-1.5 py-0.5 rounded-lg text-xs border outline-none"
          style={{ background: 'var(--card)', color: 'var(--color-text)', borderColor: 'var(--border)' }}
          onKeyDown={e => {
            if (e.key === 'Enter' && custom) { const v = parseInt(custom); if (v > 0) { onSelect(v); onClose() } }
          }}
        />
        {custom && (
          <button
            onClick={() => { const v = parseInt(custom); if (v > 0) { onSelect(v); onClose() } }}
            className="px-1.5 py-0.5 rounded-full text-xs font-medium"
            style={{ background: 'var(--color-primary)', color: 'white' }}
          >+</button>
        )}
      </div>
    </div>
  )
}

// ── Freeform input (shown in expanded area) ───────────────────────────────────

function FreeformInput({ unitLabel, onLog, onClose }: { unitLabel: string | null; onLog: (v: number) => void; onClose: () => void }) {
  const [val, setVal] = useState('')
  return (
    <div className="flex items-center gap-2 pt-2 pb-1">
      <input
        autoFocus type="number" min={1}
        placeholder={unitLabel ? `e.g. 10 ${unitLabel}` : 'amount'}
        value={val} onChange={e => setVal(e.target.value)}
        className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border outline-none"
        style={{ background: 'var(--card)', color: 'var(--color-text)', borderColor: 'var(--border)' }}
        onKeyDown={e => {
          if (e.key === 'Enter' && val) { const v = parseInt(val); if (v > 0) { onLog(v); onClose() } }
          if (e.key === 'Escape') onClose()
        }}
      />
      <button
        disabled={!val || parseInt(val) <= 0}
        onClick={() => { const v = parseInt(val); if (v > 0) { onLog(v); onClose() } }}
        className="px-2.5 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
        style={{ background: 'var(--color-primary)', color: 'white' }}
      >Log</button>
      <button onClick={onClose} className="text-xs px-1" style={{ color: 'var(--color-text-secondary)' }}>✕</button>
    </div>
  )
}

// ── Count long-press popover ──────────────────────────────────────────────────

function CountPopover({ unitLabel, onLog, onClose }: { unitLabel: string | null; onLog: (v: number) => void; onClose: () => void }) {
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

// ── Sessions list (shown in expanded area) ────────────────────────────────────

function SessionsList({ entries, habit, onRemove }: { entries: HabitTracking[]; habit: Habit; onRemove: (id: string) => void }) {
  if (entries.length === 0) return null

  function fmt(e: HabitTracking) {
    const time = new Date(e.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (habit.value_type === 'time') return `${time} — ${formatMinutes(e.value)}`
    const unit = habit.unit_label ? ` ${habit.unit_label}` : ''
    return `${time} — ${e.value}${unit}`
  }

  return (
    <div className="pt-1 pb-0.5 space-y-0.5">
      {entries.map(entry => (
        <div key={entry.id} className="flex items-center justify-between text-xs py-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          <span>{fmt(entry)}</span>
          <button onClick={() => onRemove(entry.id)} className="p-1 opacity-40 hover:opacity-100 transition-opacity" aria-label="Remove">
            <Trash2 size={10} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── HabitCard ─────────────────────────────────────────────────────────────────

interface HabitCardProps {
  habit: Habit
  userId: string
  onEdit: (habit: Habit) => void
}

export default function HabitCard({ habit, userId, onEdit }: HabitCardProps) {
  const { logEntry, removeLastEntry, removeEntry, todayEntries, weekEntries, periodTotal } = useHabitStore()

  const today = todayDate()
  const todayEnts = todayEntries(habit.id)
  const weekEnts = weekEntries(habit.id)
  const total = periodTotal(habit.id)
  const atGoal = habit.goal_value !== null && total >= habit.goal_value
  const booleanDone = habit.value_type === 'boolean' && todayEnts.some(e => e.value === 1)
  const weeklyBooleanDone = habit.value_type === 'boolean' && habit.goal_period === 'weekly'
    ? weekEnts.filter(e => e.value === 1).length >= (habit.goal_value ?? 1)
    : false
  const completed = atGoal || (booleanDone && habit.goal_period === 'daily') || weeklyBooleanDone

  const [expanded, setExpanded] = useState(false)
  const [showTimeChips, setShowTimeChips] = useState(false)
  const [showFreeform, setShowFreeform] = useState(false)
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
      logEntry({ habit_id: habit.id, user_id: userId, value: 1, period_date: today, note: null })
    } else if (habit.value_type === 'time') {
      setExpanded(true)
      setShowTimeChips(v => !v)
      setShowFreeform(false)
    } else if (habit.value_type === 'freeform') {
      setExpanded(true)
      setShowFreeform(v => !v)
      setShowTimeChips(false)
    }
  }

  function handleBooleanToggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (booleanDone) removeLastEntry(habit.id)
    else logEntry({ habit_id: habit.id, user_id: userId, value: 1, period_date: today, note: null })
  }

  function handleMinus(e: React.MouseEvent) {
    e.stopPropagation()
    if (total <= 0) return
    removeLastEntry(habit.id)
  }

  const showSessions = expanded && habit.value_type !== 'boolean' && todayEnts.length > 0
  const showWeekDots = expanded && habit.value_type === 'boolean' && habit.goal_period === 'weekly'
  const hasExpandedContent = habit.value_type !== 'boolean' || habit.goal_period === 'weekly'

  // Thin progress underline fill for non-boolean with a goal
  const progressPct = habit.goal_value && habit.value_type !== 'boolean'
    ? Math.min(100, Math.round((total / habit.goal_value) * 100))
    : null

  return (
    <motion.div layout className="relative">
      {/* ── Main row ── */}
      <div
        className="flex items-center gap-2 px-3 rounded-xl transition-colors"
        style={{
          minHeight: 40,
          background: completed
            ? 'color-mix(in srgb, var(--color-completion) 8%, var(--card))'
            : 'var(--card)',
          cursor: hasExpandedContent ? 'pointer' : 'default',
        }}
        onClick={() => hasExpandedContent && setExpanded(v => !v)}
      >
        {/* Icon */}
        {habit.icon && (
          <span className="text-base shrink-0 leading-none">{habit.icon}</span>
        )}

        {/* Title + inline progress pill for non-boolean */}
        <div className="flex-1 flex items-center gap-2 min-w-0 py-2">
          <span
            className="text-sm truncate"
            style={{
              color: completed ? 'var(--color-completion)' : 'var(--color-text)',
              fontWeight: 450,
            }}
          >
            {habit.title}
          </span>
          {/* Progress pill — only when non-boolean and has a goal or any progress */}
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

        {/* Right controls */}
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {habit.value_type === 'boolean' ? (
            // Boolean: single circle toggle
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
            // Count / time / freeform: compact − +
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
                  style={{
                    background: completed ? 'var(--color-completion)' : 'var(--color-primary)',
                    color: 'white',
                  }}
                  aria-label="Add entry"
                >
                  <Plus size={13} />
                </button>
                <AnimatePresence>
                  {showCountPopover && (
                    <CountPopover
                      unitLabel={habit.unit_label}
                      onLog={v => logEntry({ habit_id: habit.id, user_id: userId, value: v, period_date: today, note: null })}
                      onClose={() => setShowCountPopover(false)}
                    />
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          {/* Edit button */}
          <button
            onClick={() => onEdit(habit)}
            className="flex items-center justify-center w-6 h-7 rounded opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Edit habit"
          >
            ···
          </button>
        </div>
      </div>

      {/* Thin progress underline */}
      {progressPct !== null && progressPct > 0 && (
        <div className="mx-3 h-[2px] rounded-full overflow-hidden -mt-px" style={{ background: 'var(--color-foam)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: completed ? 'var(--color-completion)' : 'var(--color-primary)', opacity: 0.6 }}
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* ── Expanded area ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden px-3"
          >
            {showWeekDots && <BooleanWeekDots weekEntries={weekEnts} />}

            {showTimeChips && habit.value_type === 'time' && (
              <TimeChips
                onSelect={m => logEntry({ habit_id: habit.id, user_id: userId, value: m, period_date: today, note: null })}
                onClose={() => setShowTimeChips(false)}
              />
            )}

            {showFreeform && habit.value_type === 'freeform' && (
              <FreeformInput
                unitLabel={habit.unit_label}
                onLog={v => logEntry({ habit_id: habit.id, user_id: userId, value: v, period_date: today, note: null })}
                onClose={() => setShowFreeform(false)}
              />
            )}

            {showSessions && (
              <SessionsList entries={todayEnts} habit={habit} onRemove={removeEntry} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
