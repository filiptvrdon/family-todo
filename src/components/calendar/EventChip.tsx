import { format } from 'date-fns'
import { CalendarEvent } from '@/lib/types'

interface Props {
  event: CalendarEvent
  color: string
  showTime?: boolean
}

export default function EventChip({ event, color, showTime = false }: Props) {
  return (
    <div
      style={{
        background: color,
        borderRadius: 4,
        padding: showTime ? '3px 6px' : '2px 5px',
        fontSize: showTime ? 12 : 11,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        overflow: 'hidden',
        lineHeight: 1.3,
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
        {event.title}
      </span>
      {showTime && (
        <span style={{ opacity: 0.8, flexShrink: 0, fontSize: 10 }}>
          {format(new Date(event.start_time), 'h:mm')}–{format(new Date(event.end_time), 'h:mma')}
        </span>
      )}
    </div>
  )
}
