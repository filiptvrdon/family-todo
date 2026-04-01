interface Props {
  count: number
  color?: string
}

export default function TodoDot({ count, color = 'var(--color-primary)' }: Props) {
  const dots = Math.min(count, 6)
  return (
    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {Array.from({ length: dots }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: color,
            opacity: 0.7,
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  )
}
