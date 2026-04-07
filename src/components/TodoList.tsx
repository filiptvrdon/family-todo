'use client'

import { useId, useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Todo } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useTodoStore } from '@/stores/todo-store'
import { format, addDays } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDndMonitor,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { generateKeyBetween } from 'fractional-indexing'
import TodoDetailPanel from '@/components/TodoDetailPanel'
import TodoCard from '@/components/TodoCard'
import { triggerAiMetadata } from '@/lib/ai-metadata'

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
}

function DndMonitor({ onDragEnd }: { onDragEnd: (event: DragEndEvent) => void }) {
  useDndMonitor({ onDragEnd })
  return null
}

export default function TodoList({
  userId,
  isOwner,
  parentId, 
  onRefresh,
  useInternalDndContext = true,
  hideProgress = false
}: Props) {
  const storeMyTodos = useTodoStore(s => s.myTodos)
  const storePartnerTodos = useTodoStore(s => s.partnerTodos)
  const loading = useTodoStore(s => s.loading)
  const storeTodos = isOwner ? storeMyTodos : storePartnerTodos
  
  const localTodos = useMemo(() => {
    return storeTodos.filter(t => t.parent_id === parentId)
  }, [storeTodos, parentId])

  const [title, setTitle] = useState('')
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [energyFilter, setEnergyFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  const [questLinkMap, setQuestLinkMap] = useState<Record<string, { icon: string; name: string; status: string }[]>>({})
  const prevIdsRef = useRef<string>('')
  const [streamingNudges, setStreamingNudges] = useState<Map<string, string>>(new Map())
  const intervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set())
  const unmountedRef = useRef(false)
  
  const supabase = useMemo(() => createClient(), [])
  const dndContextId = useId()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

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
      const map: Record<string, { icon: string; name: string; status: string }[]> = {}
      for (const row of data as { task_id: string; quests: { icon: string; name: string; status: string } | { icon: string; name: string; status: string }[] | null }[]) {
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

      await useTodoStore.getState().updateTodo(active.id as string, { index: computedIndex })
    }
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
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  const ListContent = (
    <>
      <DndMonitor onDragEnd={handleDragEnd} />
      <div className="flex flex-col gap-2">
        {!parentId && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {(['all', 'low', 'medium', 'high'] as const).map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setEnergyFilter(val)}
                className="px-3 py-1 rounded-full text-xs font-medium transition whitespace-nowrap"
                style={{
                  background: energyFilter === val ? 'var(--color-primary)' : 'var(--color-foam)',
                  color: energyFilter === val ? '#fff' : 'var(--color-text-secondary)',
                  border: energyFilter === val ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border)',
                }}
              >
                {val === 'all' ? 'All' : val === 'low' ? 'Doable Now (Low)' : val.charAt(0).toUpperCase() + val.slice(1)}
              </button>
            ))}
          </div>
        )}
        {displayTodos.length === 0 && !loading && (
          <p className="text-sm text-center py-6 text-text-disabled">No tasks yet</p>
        )}
        {loading && <p className="text-sm text-center py-6 text-text-disabled">Loading tasks…</p>}
        
        <SortableContext items={displayTodos.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {displayTodos.map(todo => (
              <motion.div
                key={todo.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <TodoCard
                  todo={todo}
                  isOwner={isOwner}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                  onOpen={openDetail}
                  onEdit={editTodo}
                  isSortable={isOwner}
                  isDraggable={isOwner}
                  isDroppable={isOwner}
                  quests={questLinkMap[todo.id]}
                  streamingNudge={streamingNudges.get(todo.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>
      </div>
    </>
  )

  return (
    <div className="flex flex-col gap-3 min-w-0 relative">
      <AnimatePresence>
        {onARoll && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 bg-white px-4 py-2 rounded-full shadow-lg border border-primary flex items-center gap-2 pointer-events-none"
          >
            <span className="text-sm font-bold text-primary flex items-center gap-1">
              🔥 You&apos;re on a roll
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      {parentId && totalCount > 0 && !hideProgress && (
        <div className="flex flex-col gap-1.5 mb-1">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Progress</span>
            <span>{completedCount}/{totalCount}</span>
          </div>
          <div className="h-1.5 w-full bg-foam rounded-full overflow-hidden relative">
            <motion.div 
              className="h-full bg-primary" 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            <motion.div
              className="absolute top-0 bottom-0 bg-white/30 w-3 blur-[2px]"
              animate={{ left: `${progress}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
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
            className="text-sm rounded-xl px-3 py-2.5 w-full focus:outline-none border-[1.5px] border-border bg-card text-foreground min-h-[44px] placeholder:text-text-disabled"
          />
        </form>
      )}

      {useInternalDndContext ? (
        <DndContext id={dndContextId} sensors={sensors} collisionDetection={closestCenter}>
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
          onRefresh={() => { invalidateQuestLinks(); onRefresh() }}
        />
      )}
    </div>
  )
}
