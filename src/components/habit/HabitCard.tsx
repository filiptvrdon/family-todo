'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Check, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
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

// ── Boolean day-dot row ───────────────────────────────────────────────────────

interface BooleanWeekDotsProps {
  weekEntries: HabitTracking[]
}

function BooleanWeekDots({ weekEntries }: BooleanWeekDotsProps) {
  // Build a set of dates that have an entry with value=1
  const doneDates = new Set(weekEntries.filter(e => e.value === 1).map(e => e.period_date))

  // Generate Mon–Sun dates for the current week
  const monday = new Date(weekStartDate())
  const dots = DAY_LABELS.map((label, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const isToday = dateStr === todayDate()
    const isDone = doneDates.has(dateStr)
    const isFuture = dateStr > todayDate()
    return { label, dateStr, isToday, isDone, isFuture }
  })

  return (
    <div className="flex items-center gap-1.5 mt-2">
      {dots.map(({ label, dateStr, isToday, isDone, isFuture }) => (
        <div key={dateStr} className="flex flex-col items-center gap-0.5">
          <span
            className="text-[10px] font-medium"
            style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
          >
            {label}
          </span>
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: isDone
                ? 'var(--color-completion)'
                : isFuture
                  ? 'transparent'
                  : 'var(--color-foam)',
              border: isToday && !isDone ? '2px solid var(--color-primary)' : '2px solid transparent',
              opacity: isFuture ? 0.3 : 1,
            }}
          >
            {isDone && <Check size={10} strokeWidth={3} color="white" />}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

interface ProgressBarProps {
  total: number
  goal: number
  atGoal: boolean
}

function ProgressBar({ total, goal, atGoal }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((total / goal) * 100))
  return (
    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-foam)' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: atGoal ? 'var(--color-completion)' : 'var(--color-primary)' }}
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  )
}

// ── Sessions list ─────────────────────────────────────────────────────────────

interface SessionsListProps {
  entries: HabitTracking[]
  habit: Habit
  onRemove: (id: string) => void
}

function SessionsList({ entries, habit, onRemove }: SessionsListProps) {
  if (entries.length === 0) return null

  function formatEntry(e: HabitTracking): string {
    const time = new Date(e.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (habit.value_type === 'time') return `${time} — ${formatMinutes(e.value)}`
    const unit = habit.unit_label ? ` ${habit.unit_label}` : ''
    return `${time} — ${e.value}${unit}`
  }

  return (
    <div className="mt-2 space-y-1">
      {entries.map(entry => (
        <div
          key={entry.id}
          className="flex items-center justify-between text-xs py-0.5"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span>{formatEntry(entry)}</span>
          <button
            onClick={() => onRemove(entry.id)}
            className="p-1 rounded opacity-40 hover:opacity-100 transition-opacity"
            aria-label="Remove entry"
          >
            <Trash2 size={11} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Time chip row ─────────────────────────────────────────────────────────────

const TIME_CHIPS = [5, 10, 15, 30, 45, 60]

interface TimeChipsProps {
  onSelect: (minutes: number) => void
  onClose: () => void
}

function TimeChips({ onSelect, onClose }: TimeChipsProps) {
  const [custom, setCustom] = useState('')

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      className="mt-2 overflow-hidden"
    >
      <div className="flex flex-wrap gap-1.5 items-center">
        {TIME_CHIPS.map(m => (
          <button
            key={m}
            onClick={() => { onSelect(m); onClose() }}
            className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              background: 'var(--color-foam)',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-primary-light)',
            }}
          >
            {m}m
          </button>
        ))}
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            placeholder="other"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            className="w-14 px-2 py-1 rounded-lg text-xs border outline-none"
            style={{
              background: 'var(--card)',
              color: 'var(--color-text)',
              borderColor: 'var(--border)',
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && custom) {
                const v = parseInt(custom)
                if (v > 0) { onSelect(v); onClose() }
              }
            }}
          />
          {custom && (
            <button
              onClick={() => {
                const v = parseInt(custom)
                if (v > 0) { onSelect(v); onClose() }
              }}
              className="px-2 py-1 rounded-full text-xs font-medium transition-colors"
              style={{ background: 'var(--color-primary)', color: 'white' }}
            >
              +
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Freeform inline input ─────────────────────────────────────────────────────

interface FreeformInputProps {
  unitLabel: string | null
  onLog: (value: number) => void
  onClose: () => void
}

function FreeformInput({ unitLabel, onLog, onClose }: FreeformInputProps) {
  const [val, setVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      className="mt-2 overflow-hidden"
    >
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          autoFocus
          type="number"
          min={1}
          placeholder={unitLabel ? `e.g. 10 ${unitLabel}` : 'amount'}
          value={val}
          onChange={e => setVal(e.target.value)}
          className="flex-1 px-3 py-1.5 rounded-lg text-sm border outline-none"
          style={{
            background: 'var(--card)',
            color: 'var(--color-text)',
            borderColor: 'var(--border)',
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && val) {
              const v = parseInt(val)
              if (v > 0) { onLog(v); onClose() }
            }
            if (e.key === 'Escape') onClose()
          }}
        />
        <button
          disabled={!val || parseInt(val) <= 0}
          onClick={() => {
            const v = parseInt(val)
            if (v > 0) { onLog(v); onClose() }
          }}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
          style={{ background: 'var(--color-primary)', color: 'white' }}
        >
          Log
        </button>
        <button
          onClick={onClose}
          className="px-2 py-1.5 text-xs rounded-lg transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          ✕
        </button>
      </div>
    </motion.div>
  )
}

// ── Count long-press input ────────────────────────────────────────────────────

interface CountPopoverProps {
  unitLabel: string | null
  onLog: (value: number) => void
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
      className="absolute right-0 top-full mt-1 z-10 rounded-xl p-3 shadow-lg flex items-center gap-2"
      style={{ background: 'var(--card)', border: '1px solid var(--border)', minWidth: 160 }}
    >
      <input
        autoFocus
        type="number"
        min={1}
        placeholder={unitLabel ?? 'count'}
        value={val}
        onChange={e => setVal(e.target.value)}
        className="flex-1 px-2 py-1 rounded-lg text-sm border outline-none"
        style={{
          background: 'var(--background)',
          color: 'var(--color-text)',
          borderColor: 'var(--border)',
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' && val) {
            const v = parseInt(val)
            if (v > 0) { onLog(v); onClose() }
          }
          if (e.key === 'Escape') onClose()
        }}
      />
      <button
        disabled={!val || parseInt(val) <= 0}
        onClick={() => {
          const v = parseInt(val)
          if (v > 0) { onLog(v); onClose() }
        }}
        className="px-2 py-1 rounded-lg text-sm font-medium disabled:opacity-40"
        style={{ background: 'var(--color-primary)', color: 'white' }}
      >
        +
      </button>
    </motion.div>
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

  const [showSessions, setShowSessions] = useState(false)
  const [showTimeChips, setShowTimeChips] = useState(false)
  const [showFreeform, setShowFreeform] = useState(false)
  const [showCountPopover, setShowCountPopover] = useState(false)

  // Long-press state for count type
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
    if (didLongPress.current) return // was a long-press, popover handles it
    if (habit.value_type === 'count') {
      logEntry({ habit_id: habit.id, user_id: userId, value: 1, period_date: today, note: null })
    } else if (habit.value_type === 'time') {
      setShowTimeChips(v => !v)
      setShowFreeform(false)
    } else if (habit.value_type === 'freeform') {
      setShowFreeform(v => !v)
      setShowTimeChips(false)
    }
  }

  function handleBooleanToggle() {
    const done = todayEnts.some(e => e.value === 1)
    if (done) {
      removeLastEntry(habit.id)
    } else {
      logEntry({ habit_id: habit.id, user_id: userId, value: 1, period_date: today, note: null })
    }
  }

  function handleMinus() {
    if (total <= 0) return
    removeLastEntry(habit.id)
  }

  const booleanDone = habit.value_type === 'boolean' && todayEnts.some(e => e.value === 1)
  // For weekly boolean, use week entries
  const weeklyBooleanDone = habit.value_type === 'boolean' && habit.goal_period === 'weekly'
    ? weekEnts.filter(e => e.value === 1).length >= (habit.goal_value ?? 1)
    : false

  const showSessionsToggle = (habit.value_type !== 'boolean') && todayEnts.length > 0

  return (
    <motion.div
      layout
      className="rounded-2xl p-4 transition-colors relative"
      style={{
        background: atGoal || (booleanDone && habit.goal_period === 'daily') || weeklyBooleanDone
          ? 'color-mix(in srgb, var(--color-completion) 10%, var(--card))'
          : 'var(--card)',
        boxShadow: 'var(--shadow-card)',
        border: atGoal || booleanDone || weeklyBooleanDone
          ? '1px solid color-mix(in srgb, var(--color-completion) 30%, transparent)'
          : '1px solid var(--border)',
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {habit.icon && (
            <span className="text-xl shrink-0">{habit.icon}</span>
          )}
          <div className="min-w-0">
            <p
              className="text-sm font-medium leading-snug truncate"
              style={{ color: 'var(--color-text)' }}
            >
              {habit.title}
            </p>
            {habit.description && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                {habit.description}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => onEdit(habit)}
          className="shrink-0 text-xs px-2 py-1 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-text-secondary)' }}
          aria-label="Edit habit"
        >
          ···
        </button>
      </div>

      {/* Progress bar */}
      {habit.goal_value !== null && habit.value_type !== 'boolean' && (
        <ProgressBar total={total} goal={habit.goal_value} atGoal={atGoal} />
      )}

      {/* Boolean weekly dots */}
      {habit.value_type === 'boolean' && habit.goal_period === 'weekly' && (
        <BooleanWeekDots weekEntries={weekEnts} />
      )}

      {/* Controls */}
      <div className="mt-3">
        {habit.value_type === 'boolean' ? (
          // Boolean: single tap mark done
          <button
            onClick={handleBooleanToggle}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all min-h-[44px]"
            style={{
              background: booleanDone ? 'var(--color-completion)' : 'var(--color-foam)',
              color: booleanDone ? 'white' : 'var(--color-primary)',
              border: booleanDone ? 'none' : '1px solid var(--color-primary-light)',
            }}
          >
            {booleanDone ? (
              <>
                <Check size={16} />
                Done today
              </>
            ) : (
              <>
                <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: 'var(--color-primary)' }} />
                Mark done
              </>
            )}
          </button>
        ) : (
          // Count / time / freeform: – [progress] +
          <div className="flex items-center gap-3">
            <button
              onClick={handleMinus}
              disabled={total <= 0}
              className="flex items-center justify-center w-9 h-9 rounded-xl transition-all disabled:opacity-30"
              style={{
                background: 'var(--color-foam)',
                color: 'var(--color-primary)',
                border: '1px solid var(--color-primary-light)',
              }}
              aria-label="Remove last entry"
            >
              <Minus size={16} />
            </button>

            <span
              className="text-sm font-semibold tabular-nums min-w-[60px] text-center"
              style={{ color: atGoal ? 'var(--color-completion)' : 'var(--color-text)' }}
            >
              {formatProgress(habit, total)}
            </span>

            <div className="relative">
              <button
                onClick={handlePlusClick}
                onMouseDown={habit.value_type === 'count' ? startLongPress : undefined}
                onMouseUp={habit.value_type === 'count' ? cancelLongPress : undefined}
                onMouseLeave={habit.value_type === 'count' ? cancelLongPress : undefined}
                onTouchStart={habit.value_type === 'count' ? startLongPress : undefined}
                onTouchEnd={habit.value_type === 'count' ? cancelLongPress : undefined}
                className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
                style={{
                  background: atGoal ? 'var(--color-completion)' : 'var(--color-primary)',
                  color: 'white',
                }}
                aria-label="Add entry"
              >
                <Plus size={16} />
              </button>

              <AnimatePresence>
                {showCountPopover && (
                  <CountPopover
                    unitLabel={habit.unit_label}
                    onLog={(v) => {
                      logEntry({ habit_id: habit.id, user_id: userId, value: v, period_date: today, note: null })
                    }}
                    onClose={() => setShowCountPopover(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Time chips (inline) */}
      <AnimatePresence>
        {showTimeChips && habit.value_type === 'time' && (
          <TimeChips
            onSelect={(m) => {
              logEntry({ habit_id: habit.id, user_id: userId, value: m, period_date: today, note: null })
            }}
            onClose={() => setShowTimeChips(false)}
          />
        )}
      </AnimatePresence>

      {/* Freeform inline input */}
      <AnimatePresence>
        {showFreeform && habit.value_type === 'freeform' && (
          <FreeformInput
            unitLabel={habit.unit_label}
            onLog={(v) => {
              logEntry({ habit_id: habit.id, user_id: userId, value: v, period_date: today, note: null })
            }}
            onClose={() => setShowFreeform(false)}
          />
        )}
      </AnimatePresence>

      {/* Sessions list toggle */}
      {showSessionsToggle && (
        <button
          onClick={() => setShowSessions(v => !v)}
          className="flex items-center gap-1 mt-2 text-xs transition-opacity opacity-60 hover:opacity-100"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {showSessions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {todayEnts.length} {todayEnts.length === 1 ? 'entry' : 'entries'} today
        </button>
      )}

      <AnimatePresence>
        {showSessions && showSessionsToggle && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <SessionsList
              entries={todayEnts}
              habit={habit}
              onRemove={removeEntry}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
