'use client'

import { Pencil, Trash2 } from 'lucide-react'

interface Props {
  onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
  isOwner: boolean
}

export function TodoActions({ onEdit, onDelete, isOwner }: Props) {
  if (!isOwner) return null

  return (
    <div className="hidden md:flex items-center gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="opacity-0 group-hover:opacity-100 transition p-1 rounded-lg text-text-disabled hover:text-foreground"
      >
        <Pencil size={13} />
      </button>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition text-text-disabled hover:text-destructive p-1"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
