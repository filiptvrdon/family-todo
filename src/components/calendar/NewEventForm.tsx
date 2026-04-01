'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  defaultStart?: string  // ISO datetime string (YYYY-MM-DDTHH:mm)
  onSave: () => void
  onCancel: () => void
}

export default function NewEventForm({ userId, defaultStart = '', onSave, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [start, setStart] = useState(defaultStart)
  const [end, setEnd] = useState(defaultStart)
  const [allDay, setAllDay] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !start) return
    const endTime = end || start
    await supabase.from('calendar_events').insert({
      user_id: userId,
      title,
      start_time: new Date(start).toISOString(),
      end_time: new Date(endTime).toISOString(),
      all_day: allDay,
    })
    onSave()
  }

  return (
    <div className="mb-3 bg-foam border border-border rounded-[10px] p-3 shrink-0">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] font-semibold text-foreground">New event</p>
        <button onClick={onCancel} className="text-text-disabled cursor-pointer">
          <X size={14} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Event title"
          className="text-[13px] border border-border rounded-md px-[10px] py-1.5 bg-background text-foreground outline-none"
        />
        <div className="flex gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[11px] text-muted-foreground">Start</label>
            <input
              type="datetime-local"
              value={start}
              onChange={e => setStart(e.target.value)}
              className="text-[11px] border border-border rounded-md px-2 py-1 bg-background text-foreground outline-none"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[11px] text-muted-foreground">End</label>
            <input
              type="datetime-local"
              value={end}
              onChange={e => setEnd(e.target.value)}
              className="text-[11px] border border-border rounded-md px-2 py-1 bg-background text-foreground outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="text-xs text-muted-foreground cursor-pointer">Cancel</button>
          <button type="submit" className="text-xs font-medium bg-primary text-primary-foreground rounded-md px-3 py-1 cursor-pointer">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
