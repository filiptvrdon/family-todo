'use client'

interface AddTodoInputProps {
  value: string
  onChange: (val: string) => void
  onSubmit: (e: React.FormEvent) => void
  isSubtask: boolean
  isVisible: boolean
}

export function AddTodoInput({ value, onChange, onSubmit, isSubtask, isVisible }: AddTodoInputProps) {
  if (!isVisible) return null

  return (
    <form onSubmit={onSubmit}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={isSubtask ? "Add a sub-task…" : "Add a task…"}
        className="text-sm rounded-xl px-3 py-2.5 w-full focus:outline-none border-[1.5px] border-border bg-card text-foreground min-h-[44px] placeholder:text-text-disabled"
      />
    </form>
  )
}
