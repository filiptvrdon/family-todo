'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'
import { generateKeyBetween } from 'fractional-indexing'
import { User, Todo } from '@/lib/types'
import { useTodoStore } from '@/stores/todo-store'
import TodoList from '@/components/TodoList'
import { AddTodoInput } from './todo-list/AddTodoInput'

interface Props {
  user: User
  myTodos: Todo[]
  onRefresh: () => void
  isSubtaskMode: boolean
  dayDate: Date
}

export default function TaskBoard({ user, myTodos, onRefresh, isSubtaskMode, dayDate }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')

  async function addTodo(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const dueDate = format(dayDate, 'yyyy-MM-dd')
    const sorted = [...myTodos].sort((a, b) =>
      (a.index || '') < (b.index || '') ? -1 : (a.index || '') > (b.index || '') ? 1 : 0
    )
    const lastIndex = sorted.length > 0 ? (sorted[sorted.length - 1].index || null) : null
    const newIndex = generateKeyBetween(lastIndex, null)
    await useTodoStore.getState().addTodo({
      user_id: user.id,
      title: title.trim(),
      description: null,
      due_date: dueDate,
      recurrence: null,
      scheduled_time: null,
      parent_id: null,
      index: newIndex,
      completed: false,
      motivation_nudge: null,
      completion_nudge: null,
      energy_level: 'low',
      momentum_contribution: 0,
      completed_at: null,
    })
    setTitle('')
    setShowAdd(false)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden min-w-0">
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Tasks
        </h2>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
          style={{ background: 'var(--color-foam)', color: 'var(--color-primary)' }}
          aria-label="Add task"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {showAdd && (
          <div className="mb-3">
            <AddTodoInput
              value={title}
              onChange={setTitle}
              onSubmit={addTodo}
              isSubtask={false}
              isVisible={true}
            />
          </div>
        )}
        <TodoList
          isOwner={true}
          userId={user.id}
          parentId={null}
          onRefresh={onRefresh}
          useInternalDndContext={false}
          isSubtaskMode={isSubtaskMode}
          hideTopAddInput={true}
          dayDate={dayDate}
        />
      </div>
    </div>
  )
}
