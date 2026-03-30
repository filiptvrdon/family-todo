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
}

export default function SharedCalendar({ events, myUserId, partnerUserId, myColor, partnerColor, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: '', start: '', end: '', allDay: false })
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700 text-lg">Shared Calendar</h2>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: myColor }} />
            You
          </span>
          {partnerUserId && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: partnerColor }} />
              Partner
            </span>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg transition"
          >
            + Event
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-indigo-700">New event</p>
            <button onClick={() => setShowForm(false)} className="text-indigo-400 hover:text-indigo-600">
              <X size={14} />
            </button>
          </div>
          <form onSubmit={addEvent} className="flex flex-col gap-2">
            <input
              autoFocus
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              placeholder="Event title"
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <div className="flex gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-500">Start</label>
                <input
                  type="datetime-local"
                  value={newEvent.start}
                  onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-500">End</label>
                <input
                  type="datetime-local"
                  value={newEvent.end}
                  onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
              <button type="submit" className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg transition">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ height: 500 }}>
        <Calendar
          localizer={localizer}
          events={calEvents}
          defaultView={Views.MONTH}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          selectable
          onSelectSlot={handleSelectSlot}
          eventPropGetter={(event) => ({
            style: { backgroundColor: event.resource.color, border: 'none' },
          })}
        />
      </div>
    </div>
  )
}
