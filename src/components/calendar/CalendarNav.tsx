import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  label: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  showTodayButton: boolean
  onNewEvent: () => void
  myColor: string
  partnerColor: string | null
}

export default function CalendarNav({
  label, onPrev, onNext, onToday, showTodayButton, onNewEvent, myColor, partnerColor,
}: Props) {
  return (
    <div className="flex items-center justify-between mb-3 shrink-0">
      <div className="flex items-center gap-2">
        {/* Nav arrows */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onPrev}
            className="flex items-center justify-center w-6 h-6 rounded-md border border-border text-muted-foreground hover:bg-foam transition"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={onNext}
            className="flex items-center justify-center w-6 h-6 rounded-md border border-border text-muted-foreground hover:bg-foam transition"
          >
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Period label */}
        <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>
          {label}
        </span>

        {showTodayButton && (
          <button
            onClick={onToday}
            className="text-[11px] font-medium border border-border rounded-md px-2 py-0.5 text-muted-foreground hover:bg-foam transition"
          >
            Today
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Legend */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: myColor, display: 'inline-block', flexShrink: 0 }} />
            You
          </span>
          {partnerColor && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: partnerColor, display: 'inline-block', flexShrink: 0 }} />
              Partner
            </span>
          )}
        </div>

        <button
          onClick={onNewEvent}
          className="text-xs font-medium bg-primary text-primary-foreground rounded-md px-3 py-1 cursor-pointer"
        >
          + Event
        </button>
      </div>
    </div>
  )
}
