'use client'

import { useRef, useState } from 'react'
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
  // Controlled date state (optional — falls back to internal state)
  calendarDate?: Date
  onCalendarDateChange?: (date: Date) => void
  // Ref forwarded to the .rbc-calendar-themed container for drop detection
  containerRef?: React.RefObject<HTMLDivElement | null>
}

export default function SharedCalendar({
  events, myUserId, partnerUserId, myColor, partnerColor, onRefresh,
  calendarHeight = 500, defaultView = Views.MONTH,
  calendarDate: controlledDate, onCalendarDateChange,
  containerRef,
}: Props) {
  const [internalDate, setInternalDate] = useState(() => new Date())
  const [showForm, setShowForm] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: '', start: '', end: '', allDay: false })
  const [calendarView, setCalendarView] = useState<(typeof Views)[keyof typeof Views]>(defaultView)
  const supabase = createClient()

  const activeDate = controlledDate ?? internalDate
  function handleNavigate(date: Date) {
    setInternalDate(date)
    onCalendarDateChange?.(date)
  }

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
    <div className="flex flex-col h-full">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {/* dot color is dynamic (user color prop), kept inline */}
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: myColor, display: 'inline-block' }} />
            You
          </span>
          {partnerUserId && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: partnerColor, display: 'inline-block' }} />
              Partner
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="text-xs font-medium bg-primary text-primary-foreground rounded-md px-3 py-1 cursor-pointer"
        >
          + Event
        </button>
      </div>

      {showForm && (
        <div className="mb-3 bg-foam border border-border rounded-[10px] p-3 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-semibold text-foreground">New event</p>
            <button onClick={() => setShowForm(false)} className="text-text-disabled cursor-pointer">
              <X size={14} />
            </button>
          </div>
          <form onSubmit={addEvent} className="flex flex-col gap-2">
            <input
              autoFocus
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              placeholder="Event title"
              className="text-[13px] border border-border rounded-md px-[10px] py-1.5 bg-background text-foreground outline-none"
            />
            <div className="flex gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[11px] text-muted-foreground">Start</label>
                <input
                  type="datetime-local"
                  value={newEvent.start}
                  onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                  className="text-[11px] border border-border rounded-md px-2 py-1 bg-background text-foreground outline-none"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[11px] text-muted-foreground">End</label>
                <input
                  type="datetime-local"
                  value={newEvent.end}
                  onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
                  className="text-[11px] border border-border rounded-md px-2 py-1 bg-background text-foreground outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="text-xs text-muted-foreground cursor-pointer">Cancel</button>
              <button type="submit" className="text-xs font-medium bg-primary text-primary-foreground rounded-md px-3 py-1 cursor-pointer">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      <div ref={containerRef} className="rbc-calendar-themed flex-1 min-h-0" style={{ height: calendarHeight }}>
        <Calendar
          localizer={localizer}
          events={calEvents}
          date={activeDate}
          view={calendarView}
          onNavigate={handleNavigate}
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
