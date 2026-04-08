'use client'

import { useId, useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import {QuestLink, Todo} from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useTodoStore } from '@/stores/todo-store'
import { format, addDays } from 'date-fns'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { subtaskCollisionDetection } from '@/lib/dnd-utils'
import { useSubtaskMode } from '@/hooks/useSubtaskMode'
import { generateKeyBetween } from 'fractional-indexing'
import TodoDetailPanel from '@/components/TodoDetailPanel'
import { triggerAiMetadata } from '@/lib/ai-metadata'

// Sub-components
import { OnARollBadge } from './todo-list/OnARollBadge'
import { TodoListProgress } from './todo-list/TodoListProgress'
import { AddTodoInput } from './todo-list/AddTodoInput'
import { EnergyFilter } from './todo-list/EnergyFilter'
import { TodoItems } from './todo-list/TodoItems'
import { DndMonitor } from './todo-list/DndMonitor'

type Recurrence = 'daily' | 'weekly' | 'monthly'

function nextDueDate(recurrence: Recurrence): string {
  const today = new Date()
  if (recurrence === 'daily') return format(addDays(today, 1), 'yyyy-MM-dd')
  if (recurrence === 'weekly') return format(addDays(today, 7), 'yyyy-MM-dd')
  return format(addDays(today, 30), 'yyyy-MM-dd')
}

interface Props {
  userId: string
  isOwner: boolean
  parentId: string | null
  todos?: Todo[]
  onRefresh: () => void
  useInternalDndContext?: boolean
  hideProgress?: boolean
  isSubtaskMode?: boolean
}


export default function TodoList({
  userId,
  isOwner,
  parentId, 
  onRefresh,
  useInternalDndContext = true,
  hideProgress = false,
  isSubtaskMode: isSubtaskModeProp
}: Props) {
  const { isSubtaskMode: isSubtaskModeHook } = useSubtaskMode()
  const isSubtaskMode = isSubtaskModeProp ?? isSubtaskModeHook

  const storeMyTodos = useTodoStore(s => s.myTodos)
  const storePartnerTodos = useTodoStore(s => s.partnerTodos)
  const loading = useTodoStore(s => s.loading)
  const storeTodos = isOwner ? storeMyTodos : storePartnerTodos
  
  const localTodos = useMemo(() => {
    return storeTodos
      .filter(t => t.parent_id === parentId)
      .sort((a, b) => (a.index || '') < (b.index || '') ? -1 : (a.index || '') > (b.index || '') ? 1 : 0)
  }, [storeTodos, parentId])

  const [title, setTitle] = useState('')
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [energyFilter, setEnergyFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  const [questLinkMap, setQuestLinkMap] = useState<Record<string, QuestLink[]>>({})
  const prevIdsRef = useRef<string>('')
  const [streamingNudges, setStreamingNudges] = useState<Map<string, string>>(new Map())
  const intervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set())
  const unmountedRef = useRef(false)
  
  const supabase = useMemo(() => createClient(), [])
  const dndContextId = useId()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const collisionDetection = useCallback((args: any) => {
    return subtaskCollisionDetection(args, isSubtaskMode)
  }, [isSubtaskMode])

  useEffect(() => {
    const intervals = intervalsRef.current
    return () => {
      unmountedRef.current = true
      intervals.forEach(id => clearInterval(id))
    }
  }, [])

  useEffect(() => {
    const ids = localTodos.map(t => t.id)
    const key = ids.join(',')
    if (!ids.length || key === prevIdsRef.current) return
    prevIdsRef.current = key
    let ignore = false
    async function fetchQuestLinks() {
      const { data } = await supabase
        .from('quest_tasks')
        .select('task_id, quests(icon, name, status)')
        .in('task_id', ids)
      if (ignore || !data) return
      const map: Record<string, QuestLink[]> = {}
      for (const row of data as { task_id: string; quests: QuestLink | QuestLink[] | null }[]) {
        const q = Array.isArray(row.quests) ? row.quests[0] : row.quests
        if (!q) continue
        if (!map[row.task_id]) map[row.task_id] = []
        map[row.task_id].push(q)
      }
      setQuestLinkMap(map)
    }
    fetchQuestLinks()
    return () => { ignore = true }
  }, [localTodos, supabase])

  const startAiMetadataStream = useCallback((taskId: string) => {
    triggerAiMetadata(taskId, {
      onToken: (id, token) => {
        if (unmountedRef.current) return
        setStreamingNudges(prev => {
          const next = new Map(prev)
          next.set(id, (next.get(id) ?? '') + token)
          return next
        })
      },
      onDone: (id, text) => {
        if (unmountedRef.current) return
        setStreamingNudges(prev => {
          const next = new Map(prev)
          next.delete(id)
          return next
        })
        if (text) {
          useTodoStore.getState().updateTodo(id, { motivation_nudge: text })
        }
      },
    })
  }, [])

  const pollCompletionNudge = useCallback((todoId: string) => {
    let attempts = 0
    const iv = setInterval(async () => {
      if (unmountedRef.current) { clearInterval(iv); return }
      attempts++
      if (attempts > 20) { clearInterval(iv); intervalsRef.current.delete(iv); return }
      const { data } = await supabase
        .from('todos')
        .select('completion_nudge')
        .eq('id', todoId)
        .single()
      if (data?.completion_nudge) {
        clearInterval(iv)
        intervalsRef.current.delete(iv)
        toast(data.completion_nudge, {
          duration: 4000,
          style: { color: 'var(--color-primary-dark)', fontWeight: '500' },
        })
      }
    }, 1000)
    intervalsRef.current.add(iv)
  }, [supabase])

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

    const todoData = {
      user_id: userId,
      title: title.trim(),
      description: null,
      due_date: parentId ? null : today,
      recurrence: null,
      scheduled_time: null,
      parent_id: parentId,
      index: newIndex,
      completed: false,
      motivation_nudge: null,
      completion_nudge: null,
      energy_level: 'low' as const,
      momentum_contribution: 0,
    }

    setTitle('')
    await useTodoStore.getState().addTodo(todoData)
  }

  function invalidateQuestLinks() {
    prevIdsRef.current = ''
  }

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const [isDraggingActive, setIsDraggingActive] = useState(false)
  const [draggingTodo, setDraggingTodo] = useState<Todo | null>(null)

  const [onARoll, setOnARoll] = useState(false)
  const lastCompletionsRef = useRef<number[]>([])

  async function toggleTodo(todo: Todo) {
    const completing = !todo.completed

    await useTodoStore.getState().toggleTodo(todo.id, completing)

    if (completing) {
      // "On a roll" logic
      const now = Date.now()
      const recent = lastCompletionsRef.current.filter(t => now - t < 60000) // 1 minute
      recent.push(now)
      lastCompletionsRef.current = recent
      
      if (recent.length >= 3) {
        setOnARoll(true)
        setTimeout(() => setOnARoll(false), 3000)
        lastCompletionsRef.current = [] // reset
      }

      // Completion nudge
      if (todo.completion_nudge) {
        setTimeout(() => toast(todo.completion_nudge!, {
          duration: 4000,
          style: { color: 'var(--color-primary-dark)', fontWeight: '500' },
        }), 400)
      } else {
        pollCompletionNudge(todo.id)
      }

      // Quest nudge: check if task is linked to any quests
      const { data: links } = await supabase
        .from('quest_tasks')
        .select('quest_id, quests(name, icon)')
        .eq('task_id', todo.id)
      if (links && links.length > 0) {
        const quests = links.map((l: { quests: { name: string; icon: string } | { name: string; icon: string }[] | null }) => {
          const q = Array.isArray(l.quests) ? l.quests[0] : l.quests
          return q
        }).filter(Boolean) as { name: string; icon: string }[]
        const questLabel = quests.map(q => q.name).join(' and ')
        toast(`That moves you closer to ${questLabel}.`, {
          duration: 3500,
          style: {
            color: 'var(--color-primary-dark)',
            fontWeight: '500',
          },
        })
      }

      if (todo.recurrence) {
        setTimeout(async () => {
          const due = nextDueDate(todo.recurrence!)
          await useTodoStore.getState().updateTodo(todo.id, { completed: false, due_date: due })
        }, 1500)
      }
    }
  }

  async function editTodo(id: string, newTitle: string) {
    await useTodoStore.getState().updateTodo(id, { title: newTitle })
    startAiMetadataStream(id)
  }

  async function deleteTodo(id: string) {
    await useTodoStore.getState().deleteTodo(id)
  }

  function handleDragStart(event: DragStartEvent) {
    const todo = localTodos.find(t => t.id === event.active.id)
    setDraggingTodo(todo ?? null)
    setIsDraggingActive(true)
  }

  function handleDragCancel() {
    setDraggingTodo(null)
    setIsDraggingActive(false)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    // 1. Handle making it a subtask
    if (over.data.current?.type === 'todo-drop-target' && isSubtaskMode) {
      const targetId = over.data.current.todoId as string
      if (active.id !== targetId) {
        // Only subtask if the custom collision detection chose this target.
        // If the collision detection chose a sortable item, 'over' would not be todo-drop-target.
        
        // Compute index at the end of existing subtasks
        const existingSubTasks = storeTodos
          .filter(t => t.parent_id === targetId)
          .sort((a, b) => (a.index || '') < (b.index || '') ? -1 : (a.index || '') > (b.index || '') ? 1 : 0)
        const lastIndex = existingSubTasks.length > 0
          ? (existingSubTasks[existingSubTasks.length - 1].index || null)
          : null
        const newIndex = generateKeyBetween(lastIndex, null)

        await useTodoStore.getState().updateTodo(active.id as string, { 
          parent_id: targetId,
          index: newIndex,
          due_date: null,
          scheduled_time: null
        })
        return
      }
    }

    // 2. Handle reordering
    if (active.id === over.id) return

    const oldIndex = localTodos.findIndex(t => t.id === active.id)
    const newIndex = localTodos.findIndex(t => t.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = [...localTodos]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)

      let before = newIndex > 0 ? (reordered[newIndex - 1].index || null) : null
      let after = newIndex < reordered.length - 1 ? (reordered[newIndex + 1].index || null) : null

      // Robustness: fractional-indexing requires before < after
      if (before !== null && after !== null && before >= after) {
        after = null // Fallback: put it after before
      }

      const computedIndex = generateKeyBetween(before, after)

      await useTodoStore.getState().updateTodo(active.id as string, { index: computedIndex })
    }

    setDraggingTodo(null)
    setIsDraggingActive(false)
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const filteredTodos = useMemo(() => {
    const list = parentId 
      ? localTodos 
      : localTodos.filter(todo => !todo.completed || todo.due_date === today)
    
    if (energyFilter !== 'all') {
      return list.filter(t => t.energy_level === energyFilter)
    }
    return list
  }, [localTodos, parentId, today, energyFilter])

  const displayTodos = filteredTodos

  const completedCount = localTodos.filter(t => t.completed).length
  const totalCount = localTodos.length

  const ListContent = (
    <div className="flex flex-col gap-2">
      <DndMonitor
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      />
      <EnergyFilter
        activeFilter={energyFilter}
        onFilterChange={setEnergyFilter}
        isVisible={!parentId}
      />
      <TodoItems
        todos={displayTodos}
        isOwner={isOwner}
        onToggle={toggleTodo}
        onDelete={deleteTodo}
        onOpen={openDetail}
        onEdit={editTodo}
        questLinkMap={questLinkMap}
        streamingNudges={streamingNudges}
        loading={loading}
        isDragging={isDraggingActive}
        isSubtaskMode={isSubtaskMode}
        expandedIds={expandedIds}
        onToggleExpand={toggleExpand}
        renderSubList={(todoId) => (
          <TodoList
            userId={userId}
            isOwner={isOwner}
            parentId={todoId}
            onRefresh={onRefresh}
            useInternalDndContext={false}
            hideProgress={true}
            isSubtaskMode={isSubtaskMode}
          />
        )}
      />
    </div>
  )

  return (
    <div className="flex flex-col gap-3 min-w-0 relative">
      <OnARollBadge active={onARoll} />

      <TodoListProgress
        completedCount={completedCount}
        totalCount={totalCount}
        isVisible={!!parentId && !hideProgress}
      />

      <AddTodoInput
        value={title}
        onChange={setTitle}
        onSubmit={addTodo}
        isSubtask={!!parentId}
        isVisible={isOwner}
      />

      {useInternalDndContext ? (
        <DndContext id={dndContextId} sensors={sensors} collisionDetection={collisionDetection}>
          {ListContent}
          <DragOverlay dropAnimation={null}>
            {draggingTodo && (
              <div
                className="rounded-xl px-3 py-2 flex items-center bg-card border shadow-lg pointer-events-none opacity-90"
                style={{ borderColor: 'var(--color-primary)', minWidth: 160 }}
              >
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                  {draggingTodo.title}
                </p>
              </div>
            )}
          </DragOverlay>
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
          onRefresh={() => { invalidateQuestLinks(); onRefresh() }}
        />
      )}
    </div>
  )
}
