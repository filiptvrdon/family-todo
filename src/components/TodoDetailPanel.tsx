'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import { Drawer } from '@base-ui/react'
import { Todo } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import TodoList from "./TodoList"

type Recurrence = 'daily' | 'weekly' | 'monthly'

interface Props {
  todo: Todo
  open: boolean
  isOwner: boolean
  onClose: () => void
  onRefresh: () => void
}

export default function TodoDetailPanel({ todo, open, isOwner, onClose, onRefresh }: Props) {
  const [editTitle, setEditTitle] = useState(todo.title)
  const [editDescription, setEditDescription] = useState(todo.description ?? '')
  const [editDueDate, setEditDueDate] = useState(todo.due_date ?? '')
  const [editRecurrence, setEditRecurrence] = useState<Recurrence | ''>(todo.recurrence ?? '')
  const supabase = createClient()

  async function handleSave() {
    if (!editTitle.trim()) return
    await supabase.from('todos').update({
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      due_date: editDueDate || null,
      recurrence: (editRecurrence as Recurrence) || null,
    }).eq('id', todo.id)
    onRefresh()
    onClose()
  }

  async function handleDelete() {
    await supabase.from('todos').delete().eq('id', todo.id)
    onRefresh()
    onClose()
  }

  return (
    <Drawer.Root open={open} onOpenChange={val => !val && onClose()}>
      <Drawer.Portal>
        <Drawer.Backdrop
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--overlay-bg)',
            backdropFilter: 'blur(2px)',
            zIndex: 40,
            opacity: 'var(--opacity, 1)',
            transition: 'opacity 250ms ease',
          }}
          data-open={open || undefined}
        />
        <Drawer.Popup className="detail-panel-popup">
          <div className="overflow-y-auto h-full">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-9 h-1 rounded-full bg-text-disabled" />
          </div>

          <div className="px-5 pb-8 pt-2 flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <Drawer.Title className="text-base font-semibold text-foreground truncate">
                {todo.title}
              </Drawer.Title>
              <Drawer.Close className="flex-shrink-0 flex items-center justify-center rounded-full w-8 h-8 transition text-muted-foreground bg-foam">
                <X size={16} />
              </Drawer.Close>
            </div>

            {/* Title */}
            {isOwner ? (
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="Task title"
                className="text-sm rounded-xl px-4 py-3 w-full focus:outline-none bg-card border-[1.5px] border-border text-foreground min-h-[44px]"
              />
            ) : (
              <p className="text-sm text-foreground">{todo.title}</p>
            )}

            {/* Description */}
            {isOwner ? (
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                placeholder="Add any notes…"
                rows={3}
                className="text-sm rounded-xl px-4 py-3 w-full focus:outline-none resize-none bg-card border-[1.5px] border-border text-foreground"
              />
            ) : (
              <p className="text-sm" style={{ color: todo.description ? 'var(--color-text)' : 'var(--color-text-disabled)' }}>
                {todo.description || 'No notes'}
              </p>
            )}

            {/* Sub-tasks */}
            <TodoList parentId={todo.id} isOwner={isOwner} userId={todo.user_id} onRefresh={onRefresh} />

            {/* Due date */}
            {isOwner ? (
              <input
                type="date"
                value={editDueDate}
                onChange={e => setEditDueDate(e.target.value)}
                className="text-sm rounded-xl px-4 py-3 w-full focus:outline-none bg-card border-[1.5px] border-border min-h-[44px]"
                style={{ color: editDueDate ? 'var(--color-text)' : 'var(--color-text-disabled)' }}
              />
            ) : (
              <p className="text-sm" style={{ color: todo.due_date ? 'var(--color-text)' : 'var(--color-text-disabled)' }}>
                {todo.due_date ? format(new Date(todo.due_date + 'T00:00:00'), 'MMMM d, yyyy') : 'No due date'}
              </p>
            )}

            {/* Recurrence */}
            <div className="flex flex-col gap-2">
              {isOwner ? (
                <div className="flex gap-2 flex-wrap">
                  {(['', 'daily', 'weekly', 'monthly'] as const).map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setEditRecurrence(val)}
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition min-h-[36px]"
                      style={{
                        background: editRecurrence === val ? 'var(--color-primary)' : 'var(--color-foam)',
                        color: editRecurrence === val ? '#fff' : 'var(--color-text-secondary)',
                        border: editRecurrence === val ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border)',
                      }}
                    >
                      {val === '' ? 'None' : val.charAt(0).toUpperCase() + val.slice(1)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: todo.recurrence ? 'var(--color-text)' : 'var(--color-text-disabled)' }}>
                  {todo.recurrence ? todo.recurrence.charAt(0).toUpperCase() + todo.recurrence.slice(1) : 'Does not repeat'}
                </p>
              )}
            </div>

            {/* Actions */}
            {isOwner && (
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!editTitle.trim()}
                  className="w-full font-semibold text-sm rounded-xl transition bg-primary text-primary-foreground min-h-[48px]"
                  style={{ opacity: editTitle.trim() ? 1 : 0.4 }}
                >
                  Save changes
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full text-sm rounded-xl transition text-destructive min-h-[44px] border-[1.5px] border-destructive"
                >
                  Delete task
                </button>
              </div>
            )}
          </div>
          </div>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
