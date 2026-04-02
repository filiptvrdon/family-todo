'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, Pencil } from 'lucide-react'
import { SubTask } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { generateKeyBetween } from 'fractional-indexing'

interface Props {
  todoId: string
  isOwner: boolean
}

interface SortableItemProps {
  subTask: SubTask
  isOwner: boolean
  onToggle: (subTask: SubTask) => void
  onDelete: (id: string) => void
  onEdit: (id: string, newTitle: string) => void
}

function SortableItem({ subTask, isOwner, onToggle, onDelete, onEdit }: SortableItemProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(subTask.title)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subTask.id,
    disabled: !isOwner,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 group${isOwner ? ' cursor-grab active:cursor-grabbing' : ''}`}
      {...(isOwner ? { ...attributes, ...listeners } : {})}
    >
      <button
        type="button"
        onClick={() => isOwner && onToggle(subTask)}
        className="flex-shrink-0 w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition"
        style={{
          background: subTask.completed ? 'var(--color-primary)' : 'transparent',
          borderColor: subTask.completed ? 'var(--color-primary)' : 'var(--color-border)',
          cursor: isOwner ? 'pointer' : 'default',
        }}
      >
        {subTask.completed && <Check size={11} color="#fff" strokeWidth={3} />}
      </button>
      {editing ? (
        <input
          autoFocus
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={() => {
            if (editValue.trim() && editValue.trim() !== subTask.title) {
              onEdit(subTask.id, editValue.trim())
            } else {
              setEditValue(subTask.title)
            }
            setEditing(false)
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') { setEditValue(subTask.title); setEditing(false) }
          }}
          className="flex-1 text-sm rounded-lg px-2 py-0.5 focus:outline-none bg-card border-[1.5px] border-border text-foreground"
        />
      ) : (
        <span
          className="flex-1 text-sm"
          style={{
            color: subTask.completed ? 'var(--color-text-disabled)' : 'var(--color-text)',
            textDecoration: subTask.completed ? 'line-through' : 'none',
          }}
        >
          {subTask.title}
        </span>
      )}
      {isOwner && (
        <>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setEditing(true) }}
            className="opacity-0 group-hover:opacity-100 transition p-1 rounded-lg"
            style={{ color: 'var(--color-text-disabled)' }}
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(subTask.id)}
            className="opacity-0 group-hover:opacity-100 transition p-1 rounded-lg"
            style={{ color: 'var(--color-text-disabled)' }}
          >
            <Trash2 size={13} />
          </button>
        </>
      )}
    </li>
  )
}

export default function SubTaskList({ todoId, isOwner }: Props) {
  const [subTasks, setSubTasks] = useState<SubTask[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    fetchSubTasks()
  }, [todoId])

  async function fetchSubTasks() {
    setLoading(true)
    const { data } = await supabase
      .from('sub_tasks')
      .select('*')
      .eq('todo_id', todoId)
      .order('index', { ascending: true })
    setSubTasks(data ?? [])
    setLoading(false)
  }

  async function addSubTask(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!newTitle.trim()) return

    const lastIndex = subTasks.length > 0 ? subTasks[subTasks.length - 1].index : null
    const newIndex = generateKeyBetween(lastIndex, null)

    const tempId = `temp-${Date.now()}`
    const optimistic: SubTask = {
      id: tempId,
      todo_id: todoId,
      title: newTitle.trim(),
      completed: false,
      index: newIndex,
      created_at: new Date().toISOString(),
    }
    setSubTasks(prev => [...prev, optimistic])
    setNewTitle('')

    const { data } = await supabase
      .from('sub_tasks')
      .insert({ todo_id: todoId, title: optimistic.title, index: newIndex })
      .select()
      .single()

    if (data) {
      setSubTasks(prev => prev.map(s => s.id === tempId ? data : s))
    }
  }

  async function toggleSubTask(subTask: SubTask) {
    const next = !subTask.completed
    setSubTasks(prev => prev.map(s => s.id === subTask.id ? { ...s, completed: next } : s))
    await supabase.from('sub_tasks').update({ completed: next }).eq('id', subTask.id)
  }

  async function editSubTask(id: string, newTitle: string) {
    setSubTasks(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s))
    await supabase.from('sub_tasks').update({ title: newTitle }).eq('id', id)
  }

  async function deleteSubTask(id: string) {
    setSubTasks(prev => prev.filter(s => s.id !== id))
    await supabase.from('sub_tasks').delete().eq('id', id)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = subTasks.findIndex(s => s.id === active.id)
    const newIndex = subTasks.findIndex(s => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...subTasks]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    const before = newIndex > 0 ? (reordered[newIndex - 1].index || null) : null
    const after = newIndex < reordered.length - 1 ? (reordered[newIndex + 1].index || null) : null
    const updatedIndex = generateKeyBetween(before, after)

    const updatedMoved = { ...moved, index: updatedIndex }
    reordered[newIndex] = updatedMoved

    setSubTasks(reordered)
    const { error } = await supabase.from('sub_tasks').update({ index: updatedIndex }).eq('id', moved.id)
    if (error) console.error('SubTask reorder error:', error)
  }

  const completed = subTasks.filter(s => s.completed).length
  const total = subTasks.length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Steps</label>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">{completed}/{total}</span>
        )}
      </div>

      {total > 0 && (
        <div className="w-full h-1.5 rounded-full bg-foam overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: 'var(--color-primary)' }}
          />
        </div>
      )}

      {!loading && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={subTasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-1.5">
              {subTasks.map(subTask => (
                <SortableItem
                  key={subTask.id}
                  subTask={subTask}
                  isOwner={isOwner}
                  onToggle={toggleSubTask}
                  onDelete={deleteSubTask}
                  onEdit={editSubTask}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {isOwner && (
        <form onSubmit={addSubTask} className="flex items-center gap-2">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Add a step…"
            className="flex-1 text-sm rounded-xl px-3 py-2 focus:outline-none bg-card border-[1.5px] border-border text-foreground min-h-[36px]"
          />
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition"
            style={{
              background: newTitle.trim() ? 'var(--color-primary)' : 'var(--color-foam)',
              color: newTitle.trim() ? '#fff' : 'var(--color-text-disabled)',
            }}
          >
            <Plus size={16} />
          </button>
        </form>
      )}
    </div>
  )
}
