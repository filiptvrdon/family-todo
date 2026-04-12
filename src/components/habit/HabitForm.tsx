'use client'

import { useState, useEffect } from 'react'
import { Drawer } from '@base-ui/react'
import { X, Plus, Minus, Check, Trash2, Trash } from 'lucide-react'
import { Habit, HabitValueType, HabitGoalPeriod, HabitTracking } from '@/lib/types'
import { useHabitStore, todayDate, weekStartDate } from '@/stores/habit-store'

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_EMOJIS: Record<HabitValueType, string[]> = {
  count:    ['💧', '🥗', '💊', '🔁', '📖', '✏️', '🎯'],
  time:     ['🧘', '🏃', '📚', '🎨', '💻', '🎵', '🌿'],
  boolean:  ['🚿', '🛏️', '💤', '🌅', '🙏', '🦷', '🥦'],
  freeform: ['🏋️', '🚴', '🏊', '🧗', '📝', '🎸', '🌱'],
}

const VALUE_TYPE_LABELS: Record<HabitValueType, string> = {
  count:    'Count',
  time:     'Time',
  boolean:  'Yes / No',
  freeform: 'Variable',
}

const VALUE_TYPE_HINTS: Record<HabitValueType, string> = {
  count:    'Tap + to count. Long-press to enter a set size.',
  time:     'Log minutes spent. Quick chips: 5, 10, 15, 30…',
  boolean:  'Mark it done once per day.',
  freeform: 'Log any number each session (sets, km, words…)',
}

const TIME_CHIPS = [5, 10, 15, 30, 45, 60]
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatProgress(habit: Habit, total: number): string {
  if (habit.value_type === 'time') {
    const cur = formatMinutes(total)
    const goal = habit.goal_value ? formatMinutes(habit.goal_value) : null
    return goal ? `${cur} / ${goal}` : cur
  }
  const unit = habit.unit_label ? ` ${habit.unit_label}` : ''
  return habit.goal_value !== null ? `${total} / ${habit.goal_value}${unit}` : `${total}${unit}`
}

// ── Today tracking section ────────────────────────────────────────────────────

interface TodaySectionProps {
  habit: Habit
  userId: string
}

function TodaySection({ habit, userId }: TodaySectionProps) {
  const { logEntry, removeLastEntry, removeEntry, dateEntries, weekEntries, periodTotal } = useHabitStore()
  const [freeformVal, setFreeformVal] = useState('')
  const [customTime, setCustomTime] = useState('')

  const today = todayDate()
  const todayEnts = dateEntries(habit.id, today)
  const weekEnts = weekEntries(habit.id, today)
  const total = periodTotal(habit.id, today)
  const atGoal = habit.goal_value !== null && total >= habit.goal_value
  const booleanDone = habit.value_type === 'boolean' && todayEnts.some(e => e.value === 1)

  function log(value: number) {
    logEntry({ habit_id: habit.id, user_id: userId, value, period_date: today, note: null })
  }

  function formatEntry(e: HabitTracking): string {
    const time = new Date(e.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (habit.value_type === 'time') return `${time} — ${formatMinutes(e.value)}`
    const unit = habit.unit_label ? ` ${habit.unit_label}` : ''
    return `${time} — ${e.value}${unit}`
  }

  // Boolean: week dots
  const monday = new Date(weekStartDate())
  const doneDates = new Set(weekEnts.filter(e => e.value === 1).map(e => e.period_date))

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: atGoal || (booleanDone && habit.goal_period === 'daily')
          ? 'color-mix(in srgb, var(--color-completion) 10%, var(--color-foam))'
          : 'var(--color-foam)',
      }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
          Today
        </span>
        {habit.value_type !== 'boolean' && (total > 0 || atGoal) && (
          <span
            className="text-xs font-semibold tabular-nums"
            style={{ color: atGoal ? 'var(--color-completion)' : 'var(--color-text)' }}
          >
            {formatProgress(habit, total)}
          </span>
        )}
      </div>

      {/* Boolean */}
      {habit.value_type === 'boolean' && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => booleanDone ? removeLastEntry(habit.id, today) : log(1)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: booleanDone ? 'var(--color-completion)' : 'var(--card)',
              color: booleanDone ? 'white' : 'var(--color-primary)',
              border: booleanDone ? 'none' : '1.5px solid var(--color-primary-light)',
            }}
          >
            {booleanDone
              ? <><Check size={16} /> Done today</>
              : <><div className="w-4 h-4 rounded-full border-2" style={{ borderColor: 'var(--color-primary)' }} /> Mark done</>
            }
          </button>
          {habit.goal_period === 'weekly' && (
            <div className="flex items-center gap-2">
              {DAY_LABELS.map((label, i) => {
                const d = new Date(monday)
                d.setDate(monday.getDate() + i)
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                const isToday = dateStr === today
                const isDone = doneDates.has(dateStr)
                const isFuture = dateStr > today
                return (
                  <div key={dateStr} className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] font-medium" style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
                      {label}
                    </span>
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: isDone ? 'var(--color-completion)' : isFuture ? 'transparent' : 'var(--card)',
                        border: isToday && !isDone ? '1.5px solid var(--color-primary)' : '1.5px solid transparent',
                        opacity: isFuture ? 0.3 : 1,
                      }}
                    >
                      {isDone && <Check size={10} strokeWidth={3} color="white" />}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Count */}
      {habit.value_type === 'count' && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => removeLastEntry(habit.id, today)}
            disabled={total <= 0}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition disabled:opacity-30"
            style={{ background: 'var(--card)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-light)' }}
          >
            <Minus size={16} />
          </button>
          <span className="flex-1 text-center text-sm font-semibold tabular-nums" style={{ color: atGoal ? 'var(--color-completion)' : 'var(--color-text)' }}>
            {formatProgress(habit, total)}
          </span>
          <button
            onClick={() => log(1)}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition"
            style={{ background: atGoal ? 'var(--color-completion)' : 'var(--color-primary)', color: 'white' }}
          >
            <Plus size={16} />
          </button>
        </div>
      )}

      {/* Time */}
      {habit.value_type === 'time' && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5 items-center">
            {TIME_CHIPS.map(m => (
              <button
                key={m}
                onClick={() => log(m)}
                className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                style={{ background: 'var(--card)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-light)' }}
              >
                {m}m
              </button>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="number" min={1} placeholder="other" value={customTime}
                onChange={e => setCustomTime(e.target.value)}
                className="w-14 px-2 py-1 rounded-lg text-xs border outline-none"
                style={{ background: 'var(--card)', color: 'var(--color-text)', borderColor: 'var(--border)' }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && customTime) { const v = parseInt(customTime); if (v > 0) { log(v); setCustomTime('') } }
                }}
              />
              {customTime && (
                <button
                  onClick={() => { const v = parseInt(customTime); if (v > 0) { log(v); setCustomTime('') } }}
                  className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'var(--color-primary)', color: 'white' }}
                >+</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Freeform */}
      {habit.value_type === 'freeform' && (
        <div className="flex items-center gap-2">
          <input
            type="number" min={1}
            placeholder={habit.unit_label ? `e.g. 10 ${habit.unit_label}` : 'amount'}
            value={freeformVal}
            onChange={e => setFreeformVal(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
            style={{ background: 'var(--card)', color: 'var(--color-text)', borderColor: 'var(--border)' }}
            onKeyDown={e => {
              if (e.key === 'Enter' && freeformVal) { const v = parseInt(freeformVal); if (v > 0) { log(v); setFreeformVal('') } }
            }}
          />
          <button
            disabled={!freeformVal || parseInt(freeformVal) <= 0}
            onClick={() => { const v = parseInt(freeformVal); if (v > 0) { log(v); setFreeformVal('') } }}
            className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40 transition"
            style={{ background: 'var(--color-primary)', color: 'white' }}
          >
            Log
          </button>
        </div>
      )}

      {/* Sessions list (count / time / freeform) */}
      {habit.value_type !== 'boolean' && todayEnts.length > 0 && (
        <div className="space-y-0.5 pt-1 border-t" style={{ borderColor: 'color-mix(in srgb, var(--border) 60%, transparent)' }}>
          {todayEnts.map(entry => (
            <div key={entry.id} className="flex items-center justify-between text-xs py-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              <span>{formatEntry(entry)}</span>
              <button onClick={() => removeEntry(entry.id)} className="p-1 opacity-40 hover:opacity-100 transition-opacity" aria-label="Remove">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  title: string
  description: string
  icon: string
  value_type: HabitValueType
  unit_label: string
  goal_value: string
  goal_period: HabitGoalPeriod
}

function blankForm(): FormState {
  return { title: '', description: '', icon: '', value_type: 'boolean', unit_label: '', goal_value: '', goal_period: 'daily' }
}

function habitToForm(habit: Habit): FormState {
  return {
    title: habit.title,
    description: habit.description ?? '',
    icon: habit.icon ?? '',
    value_type: habit.value_type,
    unit_label: habit.unit_label ?? '',
    goal_value: habit.goal_value !== null ? String(habit.goal_value) : '',
    goal_period: habit.goal_period,
  }
}

// ── HabitForm ─────────────────────────────────────────────────────────────────

interface HabitFormProps {
  open: boolean
  onClose: () => void
  userId: string
  editHabit?: Habit | null
  onDelete?: (id: string) => void
}

export default function HabitForm({ open, onClose, userId, editHabit, onDelete }: HabitFormProps) {
  const { addHabit, updateHabit } = useHabitStore()
  const [form, setForm] = useState<FormState>(blankForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(editHabit ? habitToForm(editHabit) : blankForm())
  }, [open, editHabit])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const canSave = form.title.trim().length > 0

  async function handleSave() {
    if (!canSave || saving) return
    setSaving(true)
    try {
      const goalValue = form.goal_value !== '' ? parseInt(form.goal_value) : null
      const payload = {
        user_id: userId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        icon: form.icon || null,
        value_type: form.value_type,
        unit_label: form.value_type !== 'boolean' && form.unit_label.trim() ? form.unit_label.trim() : null,
        goal_value: goalValue,
        goal_period: form.goal_period,
        index: editHabit?.index ?? '',
        is_archived: false,
      }
      if (editHabit) await updateHabit(editHabit.id, payload)
      else await addHabit(payload)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const suggestedEmojis = TYPE_EMOJIS[form.value_type]

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Backdrop
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(2px)',
            zIndex: 40,
            opacity: 'var(--opacity, 1)',
            transition: 'opacity 250ms ease',
          }}
        />
        <Drawer.Popup className="detail-panel-popup">
          <div className="overflow-y-auto h-full">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full" style={{ background: 'var(--color-text-disabled)' }} />
            </div>

            <div className="px-5 pb-10 pt-2 flex flex-col gap-5">
              {/* Header */}
              <div className="flex items-center justify-between gap-3">
                <Drawer.Title className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                  {editHabit
                    ? <span className="flex items-center gap-2">{editHabit.icon && <span>{editHabit.icon}</span>}{editHabit.title}</span>
                    : 'New habit'
                  }
                </Drawer.Title>
                <Drawer.Close
                  className="flex-shrink-0 flex items-center justify-center rounded-full w-8 h-8 transition"
                  style={{ background: 'var(--color-foam)', color: 'var(--color-text-secondary)' }}
                >
                  <X size={16} />
                </Drawer.Close>
              </div>

              {/* Today tracking section — only when editing */}
              {editHabit && (
                <TodaySection habit={editHabit} userId={userId} />
              )}

              {/* Divider */}
              {editHabit && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-disabled)' }}>
                    Edit habit
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                </div>
              )}

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Name</label>
                <input
                  autoFocus={!editHabit}
                  type="text"
                  placeholder="e.g. Take creatine"
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ background: 'var(--card)', color: 'var(--color-text)', borderColor: 'var(--border)' }}
                />
              </div>

              {/* Type selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Tracking type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(VALUE_TYPE_LABELS) as HabitValueType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setField('value_type', t)}
                      className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl text-left transition-all"
                      style={{
                        background: form.value_type === t ? 'var(--color-foam)' : 'var(--card)',
                        border: form.value_type === t ? '1.5px solid var(--color-primary)' : '1.5px solid var(--border)',
                        color: form.value_type === t ? 'var(--color-primary)' : 'var(--color-text)',
                      }}
                    >
                      <span className="text-sm font-medium">{VALUE_TYPE_LABELS[t]}</span>
                      <span className="text-[11px] leading-snug" style={{ color: 'var(--color-text-secondary)' }}>
                        {VALUE_TYPE_HINTS[t]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon picker */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Icon <span className="font-normal opacity-60">(optional)</span>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {suggestedEmojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setField('icon', form.icon === emoji ? '' : emoji)}
                      className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all"
                      style={{
                        background: form.icon === emoji ? 'var(--color-foam)' : 'transparent',
                        border: form.icon === emoji ? '1.5px solid var(--color-primary)' : '1.5px solid var(--border)',
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                  <input
                    type="text" maxLength={2} placeholder="✦"
                    value={suggestedEmojis.includes(form.icon) ? '' : form.icon}
                    onChange={e => setField('icon', e.target.value)}
                    className="w-9 h-9 rounded-xl text-center text-lg border outline-none"
                    style={{ background: 'var(--card)', color: 'var(--color-text)', borderColor: 'var(--border)' }}
                  />
                </div>
              </div>

              {/* Unit label */}
              {(form.value_type === 'count' || form.value_type === 'freeform') && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    Unit <span className="font-normal opacity-60">(optional, e.g. reps, glasses, km)</span>
                  </label>
                  <input
                    type="text" placeholder="reps" value={form.unit_label}
                    onChange={e => setField('unit_label', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                    style={{ background: 'var(--card)', color: 'var(--color-text)', borderColor: 'var(--border)' }}
                  />
                </div>
              )}

              {/* Goal */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Goal <span className="font-normal opacity-60">(optional)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number" min={1}
                    placeholder={form.value_type === 'time' ? 'minutes' : form.value_type === 'boolean' ? 'days' : 'target'}
                    value={form.goal_value}
                    onChange={e => setField('goal_value', e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm border outline-none"
                    style={{ background: 'var(--card)', color: 'var(--color-text)', borderColor: 'var(--border)' }}
                  />
                  <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                    {(['daily', 'weekly'] as HabitGoalPeriod[]).map(p => (
                      <button
                        key={p}
                        onClick={() => setField('goal_period', p)}
                        className="px-3 py-2 text-sm font-medium transition-colors capitalize"
                        style={{
                          background: form.goal_period === p ? 'var(--color-primary)' : 'var(--card)',
                          color: form.goal_period === p ? 'white' : 'var(--color-text-secondary)',
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                {form.goal_value && (
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {form.value_type === 'boolean'
                      ? `${form.goal_value} days per ${form.goal_period === 'daily' ? 'day' : 'week'}`
                      : form.value_type === 'time'
                        ? `${form.goal_value} min per ${form.goal_period}`
                        : `${form.goal_value}${form.unit_label ? ' ' + form.unit_label : ''} per ${form.goal_period}`
                    }
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Notes <span className="font-normal opacity-60">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Why this habit matters to you…"
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none"
                  style={{ background: 'var(--card)', color: 'var(--color-text)', borderColor: 'var(--border)' }}
                />
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={!canSave || saving}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                style={{ background: 'var(--color-primary)', color: 'white' }}
              >
                {saving ? 'Saving…' : editHabit ? 'Save changes' : 'Add habit'}
              </button>

              {/* Delete — only when editing */}
              {editHabit && onDelete && (
                <button
                  onClick={() => { onDelete(editHabit.id); onClose() }}
                  className="w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                  style={{ color: 'var(--color-alert)', background: 'transparent', border: '1px solid color-mix(in srgb, var(--color-alert) 30%, transparent)' }}
                >
                  <Trash size={14} />
                  Delete habit
                </button>
              )}
            </div>
          </div>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
