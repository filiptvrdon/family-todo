'use client'

import { format } from 'date-fns'
import { CalendarEvent } from '@/lib/types'

interface Props {
  event: CalendarEvent
  color: string
  showTime?: boolean
  isGhost?: boolean
  previewEndTime?: Date
}

export default function EventChip({ event, color, showTime = false, isGhost = false, previewEndTime }: Props) {
  const endTime = previewEndTime ?? new Date(event.end_time)

  return (
    <div
      style={{
        background: color,
        borderRadius: 4,
        padding: showTime ? '3px 6px' : '2px 5px',
        fontSize: 11,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
        overflow: 'hidden',
        lineHeight: 1.3,
        opacity: isGhost ? 0.35 : 1,
        userSelect: 'none',
        minWidth: 0,
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, minWidth: 0 }}>
        {event.title}
      </span>
      {showTime && (
        <span style={{ opacity: 0.85, flexShrink: 0, fontSize: 10 }}>
          {format(new Date(event.start_time), 'h:mm')}–{format(endTime, 'h:mma')}
        </span>
      )}
    </div>
  )
}