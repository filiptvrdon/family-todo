'use client'

import { useId, useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { QuestLink, Todo } from '@/lib/types'
import { useTodoStore } from '@/stores/todo-store'
import { useQuestStore } from '@/stores/quest-store'
import { format, addDays, isToday } from 'date-fns'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
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

function sortByDateTime(a: Todo, b: Todo): number {
  const dateA = a.due_date ?? '9999-99-99'
  const dateB = b.due_date ?? '9999-99-99'
  if (dateA !== dateB) return dateA < dateB ? -1 : 1
  const timeA = a.scheduled_time ?? ''
  const timeB = b.scheduled_time ?? ''
  return timeA < timeB ? -1 : timeA > timeB ? 1 : 0
}

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
  hideTopAddInput?: boolean
  dayDate?: Date
}


export default function TodoList({
  userId,
  isOwner,
  parentId,
  onRefresh,
  useInternalDndContext = true,
  hideProgress = false,
  isSubtaskMode: isSubtaskModeProp,
  hideTopAddInput = false,
  dayDate,
}: Props) {
  const { isSubtaskMode: isSubtaskModeHook } = useSubtaskMode()
  const isSubtaskMode = isSubtaskModeProp ?? isSubtaskModeHook

  const storeMyTodos = useTodoStore(s => s.myTodos)
  const storePartnerTodos = useTodoStore(s => s.partnerTodos)
  const loading = useTodoStore(s => s.loading)
  const storeTodos = isOwner ? storeMyTodos : storePartnerTodos
  
  const viewDateStr = useMemo(() => dayDate ? format(dayDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'), [dayDate])
  const isActuallyToday = useMemo(() => dayDate ? isToday(dayDate) : true, [dayDate])

  const localTodos = useMemo(() => {
    let filtered = storeTodos.filter(t => t.parent_id === parentId)

    if (dayDate && !parentId) {
      filtered = filtered.filter(t => {
        // 1. Task is explicitly due on this date
        if (t.due_date === viewDateStr) return true

        // 2. Task was completed on this date
        if (t.completed_at && t.completed_at.startsWith(viewDateStr)) return true

        // 3. Task is uncompleted and should be visible today:
        if (!t.completed) {
          // a) It's overdue
          if (t.due_date && t.due_date < viewDateStr) return true

          // b) It's an Inbox task (no due date) that existed on this date
          if (!t.due_date) {
            const createdDateStr = format(new Date(t.created_at), 'yyyy-MM-dd')
            if (createdDateStr <= viewDateStr) return true
          }
        }

        return false
      })
    }

    return filtered.sort((a, b) => (a.index || '') < (b.index || '') ? -1 : (a.index || '') > (b.index || '') ? 1 : 0)
  }, [storeTodos, parentId, dayDate, viewDateStr])

  const [title, setTitle] = useState('')
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [energyFilter, setEnergyFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  const [questLinkMap, setQuestLinkMap] = useState<Record<string, QuestLink[]>>({})
  const prevIdsRef = useRef<string>('')
  const [streamingNudges, setStreamingNudges] = useState<Map<string, string>>(new Map())
  const intervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set())
  const unmountedRef = useRef(false)
  
  const quests = useQuestStore(s => s.quests)
  const dndContextId = useId()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const collisionDetection = useCallback((args: Parameters<typeof subtaskCollisionDetection>[0]) => {
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
    // Exclude optimistic temp IDs — they aren't real UUIDs and would cause a 500
    const ids = localTodos.map(t => t.id).filter(id => !id.startsWith('temp-'))
    const key = ids.join(',')
    if (!ids.length || key === prevIdsRef.current) return
    prevIdsRef.current = key
    let ignore = false
    async function fetchQuestLinks() {
      const res = await fetch(`/api/todos/quest-links?ids=${ids.join(',')}`)
      if (ignore || !res.ok) return
      const map: Record<string, QuestLink[]> = await res.json()
      setQuestLinkMap(map)
    }
    fetchQuestLinks()
    return () => { ignore = true }
  }, [localTodos])

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
      const res = await fetch(`/api/todos/${todoId}`)
      if (!res.ok) return
      const data = await res.json()
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
  }, [])

  function openDetail(todo: Todo) {
    setSelectedTodo(todo)
    setDetailOpen(true)
  }

  async function addTodo(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const lastIndex = localTodos.length > 0 ? (localTodos[localTodos.length - 1].index || null) : null
    const newIndex = generateKeyBetween(lastIndex, null)

    const todoData = {
      user_id: userId,
      title: title.trim(),
      description: null,
      due_date: parentId ? null : viewDateStr,
      recurrence: null,
      scheduled_time: null,
      parent_id: parentId,
      index: newIndex,
      completed: false,
      motivation_nudge: null,
      completion_nudge: null,
      energy_level: 'low' as const,
      momentum_contribution: 0,
      completed_at: null,
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
      const linkedQuestLinks = questLinkMap[todo.id]
      if (linkedQuestLinks && linkedQuestLinks.length > 0) {
        const questLabel = linkedQuestLinks.map(q => q.name).join(' and ')
        toast(`That moves you closer to ${questLabel}.`, {
          duration: 3500,
          style: {
            color: 'var(--color-primary-dark)',
            fontWeight: '500',
          },
        })
      } else {
        // Fall back to API if not in local map (e.g. first render)
        const res = await fetch(`/api/todos/${todo.id}/quests`)
        if (res.ok) {
          const questIds: string[] = await res.json()
          if (questIds.length > 0) {
            const linkedQuests = quests.filter(q => questIds.includes(q.id))
            if (linkedQuests.length > 0) {
              const questLabel = linkedQuests.map(q => q.name).join(' and ')
              toast(`That moves you closer to ${questLabel}.`, {
                duration: 3500,
                style: { color: 'var(--color-primary-dark)', fontWeight: '500' },
              })
            }
          }
        }
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

      const before = newIndex > 0 ? (reordered[newIndex - 1].index || null) : null
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
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const thisWeekEnd = format(addDays(new Date(), 7), 'yyyy-MM-dd')
  const nextWeekEnd = format(addDays(new Date(), 14), 'yyyy-MM-dd')

  const filteredTodos = useMemo(() => {
    const list = parentId
      ? localTodos
      : localTodos.filter(todo => !todo.completed || todo.due_date === viewDateStr || (todo.completed_at && todo.completed_at.startsWith(viewDateStr)))

    const filtered = energyFilter !== 'all' ? list.filter(t => t.energy_level === energyFilter) : list
    return parentId ? filtered : [...filtered].sort(sortByDateTime)
  }, [localTodos, parentId, viewDateStr, energyFilter])

  // Subtasks with a due_date surface in the main list under the correct time-bucket
  const surfacedSubtasks = useMemo(() => {
    if (parentId) return []
    let filtered = storeTodos.filter(t => t.parent_id !== null && t.due_date !== null && !t.completed)

    if (dayDate) {
      filtered = filtered.filter(t => {
        if (t.due_date === viewDateStr) return true
        if (t.due_date! < viewDateStr) return true
        return false
      })
    }

    return [...filtered].sort(sortByDateTime)
  }, [storeTodos, parentId, dayDate, viewDateStr])

  const parentTitleMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const sub of surfacedSubtasks) {
      const parent = storeTodos.find(t => t.id === sub.parent_id)
      if (parent) map[sub.id] = parent.title
    }
    return map
  }, [surfacedSubtasks, storeTodos])

  const todoSections = useMemo(() => {
    if (parentId || (dayDate && !isActuallyToday)) return undefined
    return [
      {
        label: 'Today',
        todos: filteredTodos.filter(t => t.due_date && t.due_date <= today),
        surfacedSubtasks: surfacedSubtasks.filter(t => t.due_date! <= today),
      },
      {
        label: 'Tomorrow',
        todos: filteredTodos.filter(t => t.due_date === tomorrow),
        surfacedSubtasks: surfacedSubtasks.filter(t => t.due_date === tomorrow),
      },
      {
        label: 'This Week',
        todos: filteredTodos.filter(t => t.due_date && t.due_date > tomorrow && t.due_date <= thisWeekEnd),
        surfacedSubtasks: surfacedSubtasks.filter(t => t.due_date! > tomorrow && t.due_date! <= thisWeekEnd),
      },
      {
        label: 'Next Week',
        todos: filteredTodos.filter(t => t.due_date && t.due_date > thisWeekEnd && t.due_date <= nextWeekEnd),
        surfacedSubtasks: surfacedSubtasks.filter(t => t.due_date! > thisWeekEnd && t.due_date! <= nextWeekEnd),
      },
      {
        label: 'Later',
        todos: filteredTodos.filter(t => !t.due_date || t.due_date > nextWeekEnd),
        surfacedSubtasks: surfacedSubtasks.filter(t => t.due_date! > nextWeekEnd),
      },
    ]
  }, [filteredTodos, parentId, today, tomorrow, thisWeekEnd, nextWeekEnd, surfacedSubtasks, dayDate, isActuallyToday])

  const displayTodos = useMemo(() => {
    if (todoSections) return filteredTodos
    if (parentId) return filteredTodos
    return [...filteredTodos, ...surfacedSubtasks].sort(sortByDateTime)
  }, [filteredTodos, surfacedSubtasks, todoSections, parentId])

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
        sections={todoSections}
        isOwner={isOwner}
        onToggle={toggleTodo}
        onOpen={openDetail}
        onEdit={editTodo}
        questLinkMap={questLinkMap}
        streamingNudges={streamingNudges}
        loading={loading}
        isDragging={isDraggingActive}
        isSubtaskMode={isSubtaskMode}
        expandedIds={expandedIds}
        onToggleExpand={toggleExpand}
        parentTitleMap={parentTitleMap}
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
        isVisible={isOwner && (!hideTopAddInput || !!parentId)}
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
