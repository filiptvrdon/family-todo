'use client'

interface Props {
  title: string
  completed: boolean
  nudge?: string | null
}

export function TodoDisplay({ title, completed, nudge }: Props) {
  return (
    <>
      <p
        className={`text-sm font-medium truncate ${completed ? 'line-through' : ''}`}
        style={{ color: completed ? 'var(--color-text-secondary)' : 'var(--color-text)' }}
      >
        {title}
      </p>
      {!completed && nudge && (
        <p className="text-[11px] italic mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
          {nudge}
        </p>
      )}
    </>
  )
}
