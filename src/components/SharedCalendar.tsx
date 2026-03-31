'use client'

import { useState } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import { CalendarEvent } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { 'en-US': enUS },
})

const MIN_TIME = new Date(0, 0, 0, 5, 0, 0)
const MAX_TIME = new Date(0, 0, 0, 20, 0, 0)

interface CalEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: { userId: string; color: string }
}

interface Props {
  events: CalendarEvent[]
  myUserId: string
  partnerUserId: string | null
  myColor: string
  partnerColor: string
  onRefresh: () => void
  calendarHeight?: number
  defaultView?: (typeof Views)[keyof typeof Views]
}

export default function SharedCalendar({ events, myUserId, partnerUserId, myColor, partnerColor, onRefresh, calendarHeight = 500, defaultView = Views.MONTH }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: '', start: '', end: '', allDay: false })
  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const [calendarView, setCalendarView] = useState<(typeof Views)[keyof typeof Views]>(defaultView)
  const supabase = createClient()

  const calEvents: CalEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: new Date(e.start_time),
    end: new Date(e.end_time),
    resource: {
      userId: e.user_id,
      color: e.user_id === myUserId ? myColor : partnerColor,
    },
  }))

  async function addEvent(ev: React.FormEvent) {
    ev.preventDefault()
    if (!newEvent.title || !newEvent.start) return
    const end = newEvent.end || newEvent.start
    await supabase.from('calendar_events').insert({
      user_id: myUserId,
      title: newEvent.title,
      start_time: new Date(newEvent.start).toISOString(),
      end_time: new Date(end).toISOString(),
      all_day: newEvent.allDay,
    })
    setNewEvent({ title: '', start: '', end: '', allDay: false })
    setShowForm(false)
    onRefresh()
  }

  async function handleSelectSlot(slotInfo: { start: Date; end: Date }) {
    const fmt = (d: Date) => d.toISOString().slice(0, 16)
    setNewEvent({ title: '', start: fmt(slotInfo.start), end: fmt(slotInfo.end), allDay: false })
    setShowForm(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: myColor, display: 'inline-block' }} />
            You
          </span>
          {partnerUserId && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: partnerColor, display: 'inline-block' }} />
              Partner
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            fontSize: 12,
            fontWeight: 500,
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '4px 12px',
            cursor: 'pointer',
          }}
        >
          + Event
        </button>
      </div>

      {showForm && (
        <div style={{ marginBottom: 12, background: 'var(--color-foam)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>New event</p>
            <button onClick={() => setShowForm(false)} style={{ color: 'var(--color-text-disabled)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
          <form onSubmit={addEvent} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              autoFocus
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              placeholder="Event title"
              style={{ fontSize: 13, border: '1px solid var(--color-border)', borderRadius: 6, padding: '6px 10px', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Start</label>
                <input
                  type="datetime-local"
                  value={newEvent.start}
                  onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                  style={{ fontSize: 11, border: '1px solid var(--color-border)', borderRadius: 6, padding: '4px 8px', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>End</label>
                <input
                  type="datetime-local"
                  value={newEvent.end}
                  onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
                  style={{ fontSize: 11, border: '1px solid var(--color-border)', borderRadius: 6, padding: '4px 8px', outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ fontSize: 12, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ fontSize: 12, fontWeight: 500, background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rbc-calendar-themed" style={{ flex: 1, minHeight: 0, height: calendarHeight }}>
        <Calendar
          localizer={localizer}
          events={calEvents}
          date={calendarDate}
          view={calendarView}
          onNavigate={(date) => setCalendarDate(date)}
          onView={(view) => setCalendarView(view)}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          min={MIN_TIME}
          max={MAX_TIME}
          scrollToTime={MIN_TIME}
          selectable
          onSelectSlot={handleSelectSlot}
          eventPropGetter={(event) => ({
            style: { backgroundColor: event.resource.color, border: 'none', borderRadius: 6, fontSize: 12, padding: '2px 6px' },
          })}
        />
      </div>
    </div>
  )
}
