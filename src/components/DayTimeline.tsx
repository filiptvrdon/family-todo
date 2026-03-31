'use client'

import { useEffect, useRef } from 'react'
import { CalendarEvent } from '@/lib/types'
import { format } from 'date-fns'

const START_HOUR = 5
const END_HOUR = 20

function formatHour(h: number): string {
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

interface Props {
  events: CalendarEvent[]
}

export default function DayTimeline({ events }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const today = format(new Date(), 'yyyy-MM-dd')
  const currentHour = new Date().getHours()

  const todayEvents = events.filter(
    (e) => format(new Date(e.start_time), 'yyyy-MM-dd') === today,
  )
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR)

  useEffect(() => {
    const scrollToHour = Math.max(START_HOUR, Math.min(END_HOUR, currentHour - 1))
    containerRef.current
      ?.querySelector(`[data-hour="${scrollToHour}"]`)
      ?.scrollIntoView({ block: 'start' })
  }, [currentHour])

  return (
    <div ref={containerRef} style={{ overflowY: 'auto', height: 192 }}>
      {hours.map((hour) => {
        const hourEvents = todayEvents.filter((e) => new Date(e.start_time).getHours() === hour)
        const isCurrent = hour === currentHour

        return (
          <div
            key={hour}
            data-hour={hour}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              minHeight: 32,
              background: isCurrent ? 'rgba(0,181,200,0.05)' : 'transparent',
            }}
          >
            <span
              style={{
                width: 44,
                fontSize: 10,
                fontWeight: isCurrent ? 600 : 400,
                color: isCurrent ? 'var(--color-primary)' : 'var(--color-text-disabled)',
                paddingTop: 7,
                flexShrink: 0,
                letterSpacing: '0.01em',
              }}
            >
              {formatHour(hour)}
            </span>

            <div
              style={{
                flex: 1,
                borderTop: `1px solid ${isCurrent ? 'var(--color-primary)' : 'var(--color-border)'}`,
                marginTop: 7,
                paddingTop: hourEvents.length ? 4 : 0,
                paddingBottom: hourEvents.length ? 6 : 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {hourEvents.map((e) => (
                <div
                  key={e.id}
                  style={{
                    background: 'var(--color-primary)',
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: 11,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {e.title}
                  </span>
                  <span style={{ opacity: 0.75, flexShrink: 0, fontSize: 10 }}>
                    {format(new Date(e.start_time), 'h:mm')}–{format(new Date(e.end_time), 'h:mma')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
