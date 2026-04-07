'use client'

type EnergyLevel = 'all' | 'low' | 'medium' | 'high'

interface EnergyFilterProps {
  activeFilter: EnergyLevel
  onFilterChange: (val: EnergyLevel) => void
  isVisible: boolean
}

export function EnergyFilter({ activeFilter, onFilterChange, isVisible }: EnergyFilterProps) {
  if (!isVisible) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {(['all', 'low', 'medium', 'high'] as const).map(val => (
        <button
          key={val}
          type="button"
          onClick={() => onFilterChange(val)}
          className="px-3 py-1 rounded-full text-xs font-medium transition whitespace-nowrap"
          style={{
            background: activeFilter === val ? 'var(--color-primary)' : 'var(--color-foam)',
            color: activeFilter === val ? '#fff' : 'var(--color-text-secondary)',
            border: activeFilter === val ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border)',
          }}
        >
          {val === 'all' ? 'All' : val === 'low' ? 'Doable Now (Low)' : val.charAt(0).toUpperCase() + val.slice(1)}
        </button>
      ))}
    </div>
  )
}
