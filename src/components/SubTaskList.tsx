'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import { SubTask } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface Props {
  todoId: string
  isOwner: boolean
}

export default function SubTaskList({ todoId, isOwner }: Props) {
  const [subTasks, setSubTasks] = useState<SubTask[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchSubTasks()
  }, [todoId])

  async function fetchSubTasks() {
    setLoading(true)
    const { data } = await supabase
      .from('sub_tasks')
      .select('*')
      .eq('todo_id', todoId)
      .order('created_at', { ascending: true })
    setSubTasks(data ?? [])
    setLoading(false)
  }

  async function addSubTask(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!newTitle.trim()) return

    const tempId = `temp-${Date.now()}`
    const optimistic: SubTask = {
      id: tempId,
      todo_id: todoId,
      title: newTitle.trim(),
      completed: false,
      created_at: new Date().toISOString(),
    }
    setSubTasks(prev => [...prev, optimistic])
    setNewTitle('')

    const { data } = await supabase
      .from('sub_tasks')
      .insert({ todo_id: todoId, title: optimistic.title })
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

  async function deleteSubTask(id: string) {
    setSubTasks(prev => prev.filter(s => s.id !== id))
    await supabase.from('sub_tasks').delete().eq('id', id)
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
        <ul className="flex flex-col gap-1.5">
          {subTasks.map(subTask => (
            <li key={subTask.id} className="flex items-center gap-2 group">
              <button
                type="button"
                onClick={() => isOwner && toggleSubTask(subTask)}
                className="flex-shrink-0 w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition"
                style={{
                  background: subTask.completed ? 'var(--color-primary)' : 'transparent',
                  borderColor: subTask.completed ? 'var(--color-primary)' : 'var(--color-border)',
                  cursor: isOwner ? 'pointer' : 'default',
                }}
              >
                {subTask.completed && <Check size={11} color="#fff" strokeWidth={3} />}
              </button>
              <span
                className="flex-1 text-sm"
                style={{
                  color: subTask.completed ? 'var(--color-text-disabled)' : 'var(--color-text)',
                  textDecoration: subTask.completed ? 'line-through' : 'none',
                }}
              >
                {subTask.title}
              </span>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => deleteSubTask(subTask.id)}
                  className="opacity-0 group-hover:opacity-100 transition p-1 rounded-lg"
                  style={{ color: 'var(--color-text-disabled)' }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
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
