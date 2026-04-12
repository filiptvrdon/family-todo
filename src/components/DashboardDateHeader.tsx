'use client'

import { useState, useEffect } from 'react'
import { format, addDays, subDays, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

interface Props {
  date: Date
  onChange: (date: Date) => void
}

export default function DashboardDateHeader({ date, onChange }: Props) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handlePrevDay = () => onChange(subDays(date, 1))
  const handleNextDay = () => onChange(addDays(date, 1))
  const handleToday = () => onChange(new Date())

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-4 bg-card border-b border-border gap-4">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-baseline gap-3">
          <span>{isToday(date) ? 'Today' : format(date, 'EEEE')}</span>
          <span className="text-sm font-medium text-muted-foreground">
            {format(date, 'MMMM do, yyyy')}
          </span>
        </h1>
        <div className="text-xs font-mono text-muted-foreground mt-1">
          {format(now, 'HH:mm:ss')}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-foam rounded-lg p-1 border border-border">
          <button
            onClick={handlePrevDay}
            className="p-1.5 hover:bg-card rounded-md transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Previous day"
          >
            <ChevronLeft size={18} />
          </button>
          
          <button
            onClick={handleToday}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${
              isToday(date) 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'hover:bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            Today
          </button>

          <button
            onClick={handleNextDay}
            className="p-1.5 hover:bg-card rounded-md transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Next day"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="relative">
          <input
            type="date"
            value={format(date, 'yyyy-MM-dd')}
            onChange={(e) => {
              const newDate = new Date(e.target.value)
              if (!isNaN(newDate.getTime())) {
                onChange(newDate)
              }
            }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
          />
          <button className="flex items-center gap-2 px-3 py-2 bg-foam border border-border rounded-lg text-sm font-medium hover:bg-card transition-colors text-muted-foreground hover:text-foreground">
            <CalendarIcon size={16} />
            <span className="hidden sm:inline">Pick Date</span>
          </button>
        </div>
      </div>
    </div>
  )
}
