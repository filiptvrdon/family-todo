'use client'

interface Props {
  title: string
  completed: boolean
  nudge?: string | null
  parentTitle?: string
}

export function TodoDisplay({ title, completed, nudge, parentTitle }: Props) {
  return (
    <>
      <p
        className={`text-sm font-medium truncate ${completed ? 'line-through' : ''}`}
        style={{ color: completed ? 'var(--color-text-secondary)' : 'var(--color-text)' }}
      >
        {title}
      </p>
      {parentTitle && (
        <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--color-text-disabled)' }}>
          ↳ {parentTitle}
        </p>
      )}
      {!completed && nudge && (
        <p className="text-[11px] italic mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
          {nudge}
        </p>
      )}
    </>
  )
}
