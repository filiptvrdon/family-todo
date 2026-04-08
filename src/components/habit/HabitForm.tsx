'use client'

import { useState, useEffect } from 'react'
import { Drawer } from '@base-ui/react'
import { X } from 'lucide-react'
import { Habit, HabitValueType, HabitGoalPeriod } from '@/lib/types'
import { useHabitStore } from '@/stores/habit-store'

// ── Emoji suggestions per type ────────────────────────────────────────────────

const TYPE_EMOJIS: Record<HabitValueType, string[]> = {
  count:   ['💧', '🥗', '💊', '🔁', '📖', '✏️', '🎯'],
  time:    ['🧘', '🏃', '📚', '🎨', '💻', '🎵', '🌿'],
  boolean: ['🚿', '🛏️', '💤', '🌅', '🙏', '🦷', '🥦'],
  freeform:['🏋️', '🚴', '🏊', '🧗', '📝', '🎸', '🌱'],
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

// ── Blank form state ──────────────────────────────────────────────────────────

interface FormState {
  title: string
  description: string
  icon: string
  value_type: HabitValueType
  unit_label: string
  goal_value: string        // stored as string for input; convert on save
  goal_period: HabitGoalPeriod
}

function blankForm(): FormState {
  return {
    title: '',
    description: '',
    icon: '',
    value_type: 'boolean',
    unit_label: '',
    goal_value: '',
    goal_period: 'daily',
  }
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
  /** If provided, we're editing an existing habit */
  editHabit?: Habit | null
}

export default function HabitForm({ open, onClose, userId, editHabit }: HabitFormProps) {
  const { addHabit, updateHabit } = useHabitStore()
  const [form, setForm] = useState<FormState>(blankForm())
  const [saving, setSaving] = useState(false)

  // Sync form when editHabit changes or drawer opens
  useEffect(() => {
    if (open) {
      setForm(editHabit ? habitToForm(editHabit) : blankForm())
    }
  }, [open, editHabit])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
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
        unit_label: form.value_type !== 'boolean' && form.unit_label.trim()
          ? form.unit_label.trim()
          : null,
        goal_value: goalValue,
        goal_period: form.goal_period,
        index: editHabit?.index ?? '',
        is_archived: false,
      }
      if (editHabit) {
        await updateHabit(editHabit.id, payload)
      } else {
        await addHabit(payload)
      }
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
                  {editHabit ? 'Edit habit' : 'New habit'}
                </Drawer.Title>
                <Drawer.Close
                  className="flex-shrink-0 flex items-center justify-center rounded-full w-8 h-8 transition"
                  style={{ background: 'var(--color-foam)', color: 'var(--color-text-secondary)' }}
                >
                  <X size={16} />
                </Drawer.Close>
              </div>

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Name
                </label>
                <input
                  autoFocus={!editHabit}
                  type="text"
                  placeholder="e.g. Take creatine"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{
                    background: 'var(--card)',
                    color: 'var(--color-text)',
                    borderColor: 'var(--border)',
                  }}
                />
              </div>

              {/* Type selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Tracking type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(VALUE_TYPE_LABELS) as HabitValueType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => set('value_type', t)}
                      className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl text-left transition-all"
                      style={{
                        background: form.value_type === t ? 'var(--color-foam)' : 'var(--card)',
                        border: form.value_type === t
                          ? '1.5px solid var(--color-primary)'
                          : '1.5px solid var(--border)',
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
                      onClick={() => set('icon', form.icon === emoji ? '' : emoji)}
                      className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all"
                      style={{
                        background: form.icon === emoji ? 'var(--color-foam)' : 'transparent',
                        border: form.icon === emoji
                          ? '1.5px solid var(--color-primary)'
                          : '1.5px solid var(--border)',
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="✦"
                    value={suggestedEmojis.includes(form.icon) ? '' : form.icon}
                    onChange={e => set('icon', e.target.value)}
                    className="w-9 h-9 rounded-xl text-center text-lg border outline-none"
                    style={{
                      background: 'var(--card)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--border)',
                    }}
                  />
                </div>
              </div>

              {/* Unit label (count + freeform only) */}
              {(form.value_type === 'count' || form.value_type === 'freeform') && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    Unit <span className="font-normal opacity-60">(optional, e.g. reps, glasses, km)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="reps"
                    value={form.unit_label}
                    onChange={e => set('unit_label', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                    style={{
                      background: 'var(--card)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--border)',
                    }}
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
                    type="number"
                    min={1}
                    placeholder={
                      form.value_type === 'time' ? 'minutes'
                      : form.value_type === 'boolean' ? 'days'
                      : 'target'
                    }
                    value={form.goal_value}
                    onChange={e => set('goal_value', e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm border outline-none"
                    style={{
                      background: 'var(--card)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--border)',
                    }}
                  />
                  {/* Period selector */}
                  <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                    {(['daily', 'weekly'] as HabitGoalPeriod[]).map(p => (
                      <button
                        key={p}
                        onClick={() => set('goal_period', p)}
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
                  onChange={e => set('description', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none"
                  style={{
                    background: 'var(--card)',
                    color: 'var(--color-text)',
                    borderColor: 'var(--border)',
                  }}
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
            </div>
          </div>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
