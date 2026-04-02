'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Todo } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { format, addDays } from 'date-fns'
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { generateKeyBetween } from 'fractional-indexing'
import TodoDetailPanel from '@/components/TodoDetailPanel'
import TodoCard from '@/components/TodoCard'

const CELEBRATIONS = [
  'Badass 🍑',
  'You rock 🤘',
  'Nailed it 🔨',
  "That's my girl 💙 ",
  'Knocked it out 🥊',
]

type Recurrence = 'daily' | 'weekly' | 'monthly'

function nextDueDate(recurrence: Recurrence): string {
  const today = new Date()
  if (recurrence === 'daily') return format(addDays(today, 1), 'yyyy-MM-dd')
  if (recurrence === 'weekly') return format(addDays(today, 7), 'yyyy-MM-dd')
  return format(addDays(today, 30), 'yyyy-MM-dd')
}

interface Props {
  userId: string
  ownerName: string
  isOwner: boolean
  parentId: string | null
  todos?: Todo[]
  onRefresh: () => void
  useInternalDndContext?: boolean
}

export default function TodoList({ 
  userId, 
  ownerName, 
  isOwner, 
  parentId, 
  todos, 
  onRefresh,
  useInternalDndContext = true
}: Props) {
  const [localTodos, setLocalTodos] = useState<Todo[]>(todos ?? [])
  const [title, setTitle] = useState('')
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [loading, setLoading] = useState(!todos && !!parentId)
  const supabase = createClient()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const fetchSubTasks = useCallback(async () => {
    if (!parentId) return
    setLoading(true)
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('parent_id', parentId)
      .order('index', { ascending: true })
    setLocalTodos(data ?? [])
    setLoading(false)
  }, [parentId, supabase])

  useEffect(() => {
    if (todos) {
      setLocalTodos(todos)
      setLoading(false)
    } else if (parentId) {
      fetchSubTasks()
    }
  }, [todos, parentId, fetchSubTasks])

  function openDetail(todo: Todo) {
    setSelectedTodo(todo)
    setDetailOpen(true)
  }

  async function addTodo(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const today = format(new Date(), 'yyyy-MM-dd')
    const lastIndex = localTodos.length > 0 ? (localTodos[localTodos.length - 1].index || null) : null
    const newIndex = generateKeyBetween(lastIndex, null)

    const tempId = `temp-${Date.now()}`
    const optimistic: Todo = {
      id: tempId,
      user_id: userId,
      title: title.trim(),
      description: null,
      due_date: parentId ? null : today,
      recurrence: null,
      scheduled_time: null,
      parent_id: parentId,
      index: newIndex,
      completed: false,
      created_at: new Date().toISOString(),
    }

    setLocalTodos(prev => [...prev, optimistic])
    setTitle('')

    const { data } = await supabase.from('todos').insert({
      user_id: userId,
      title: optimistic.title,
      due_date: optimistic.due_date,
      parent_id: parentId,
      index: newIndex,
    }).select().single()

    if (data) {
      setLocalTodos(prev => prev.map(t => t.id === tempId ? data : t))
    }
    onRefresh()
  }

  async function toggleTodo(todo: Todo) {
    const completing = !todo.completed

    setLocalTodos(prev =>
      prev.map(t => t.id === todo.id ? { ...t, completed: completing } : t)
    )

    if (completing) {
      toast(CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)], {
        duration: 2000,
        style: {
          color: 'var(--color-completion)',
          fontWeight: '500',
        },
      })

      await supabase.from('todos').update({ completed: true }).eq('id', todo.id)

      if (todo.recurrence) {
        setTimeout(async () => {
          const due = nextDueDate(todo.recurrence!)
          await supabase
            .from('todos')
            .update({ completed: false, due_date: due })
            .eq('id', todo.id)
          onRefresh()
        }, 1500)
      } else {
        onRefresh()
      }
    } else {
      await supabase.from('todos').update({ completed: false }).eq('id', todo.id)
      onRefresh()
    }
  }

  async function editTodo(id: string, newTitle: string) {
    setLocalTodos(prev => prev.map(t => t.id === id ? { ...t, title: newTitle } : t))
    await supabase.from('todos').update({ title: newTitle }).eq('id', id)
    onRefresh()
  }

  async function deleteTodo(id: string) {
    setLocalTodos(prev => prev.filter(t => t.id !== id))
    await supabase.from('todos').delete().eq('id', id)
    onRefresh()
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = localTodos.findIndex(t => t.id === active.id)
    const newIndex = localTodos.findIndex(t => t.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = [...localTodos]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)

      const before = newIndex > 0 ? (reordered[newIndex - 1].index || null) : null
      const after = newIndex < reordered.length - 1 ? (reordered[newIndex + 1].index || null) : null
      const computedIndex = generateKeyBetween(before, after)

      setLocalTodos(reordered.map((t, i) => i === newIndex ? { ...t, index: computedIndex } : t))

      await supabase.from('todos').update({ index: computedIndex }).eq('id', active.id)
      onRefresh()
    }
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const displayTodos = parentId 
    ? localTodos 
    : localTodos.filter(todo => !todo.completed || todo.due_date === today)

  const completedCount = localTodos.filter(t => t.completed).length
  const totalCount = localTodos.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  const ListContent = (
    <div className="flex flex-col gap-2">
      {displayTodos.length === 0 && !loading && (
        <p className="text-sm text-center py-6 text-text-disabled">No tasks yet</p>
      )}
      {loading && <p className="text-sm text-center py-6 text-text-disabled">Loading tasks…</p>}
      
      <SortableContext items={displayTodos.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {displayTodos.map(todo => (
          <TodoCard
            key={todo.id}
            todo={todo}
            isOwner={isOwner}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
            onOpen={openDetail}
            onEdit={editTodo}
            isSortable={isOwner}
            isDraggable={isOwner && parentId === null}
            isDroppable={isOwner && parentId === null}
          />
        ))}
      </SortableContext>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {parentId && totalCount > 0 && (
        <div className="flex flex-col gap-1.5 mb-1">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Progress</span>
            <span>{completedCount}/{totalCount}</span>
          </div>
          <div className="h-1.5 w-full bg-foam rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {isOwner && (
        <form onSubmit={addTodo}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={parentId ? "Add a sub-task…" : "Add a task…"}
            className="text-sm rounded-xl px-3 py-2.5 w-full focus:outline-none border border-border bg-background text-foreground min-h-[44px] placeholder:text-text-disabled"
          />
        </form>
      )}

      {useInternalDndContext ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {ListContent}
        </DndContext>
      ) : (
        ListContent
      )}

      {selectedTodo && (
        <TodoDetailPanel
          key={selectedTodo.id}
          todo={localTodos.find(t => t.id === selectedTodo.id) ?? selectedTodo}
          open={detailOpen}
          isOwner={isOwner}
          onClose={() => setDetailOpen(false)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  )
}
