'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { Drawer } from '@base-ui/react'
import { toast } from 'sonner'
import { Todo, Quest } from '@/lib/types'
import { triggerAiMetadata } from '@/lib/ai-metadata'
import { useTodoStore } from '@/stores/todo-store'
import { useQuestStore } from '@/stores/quest-store'
import { QuestIcon } from '@/lib/questIcons'
import TodoList from "./TodoList"
import { motion } from 'framer-motion'

type Recurrence = 'daily' | 'weekly' | 'monthly'

interface Props {
  todo: Todo
  open: boolean
  isOwner: boolean
  onClose: () => void
  onRefresh: () => void
}

const whyQuestions = [
  "Why is this task important for you right now?",
  "What context makes this task a priority?",
  "How will completing this help you achieve your goals?",
  "What's the impact of getting this done today?",
  "Why does this task matter to your family?",
  "In what situation will this task be most relevant?",
  "What is the core reason you want to finish this?",
  "How does this task fit into your weekly plan?",
  "What motivated you to add this task?",
  "What's the underlying value of this task?",
];

const getRandomWhyQuestion = () => whyQuestions[Math.floor(Math.random() * whyQuestions.length)];

export default function TodoDetailPanel({ todo, open, isOwner, onClose, onRefresh }: Props) {
  const [editTitle, setEditTitle] = useState(todo.title)
  const [editDescription, setEditDescription] = useState(todo.description ?? '')
  const [editDueDate, setEditDueDate] = useState(todo.due_date ?? '')
  const [editRecurrence, setEditRecurrence] = useState<Recurrence | ''>(todo.recurrence ?? '')
  const [editEnergyLevel, setEditEnergyLevel] = useState<'low' | 'medium' | 'high'>(todo.energy_level || 'low')
  const [activeQuests, setActiveQuests] = useState<Quest[]>([])
  const [initialLinkedQuestIds, setInitialLinkedQuestIds] = useState<Set<string>>(new Set())
  const [linkedQuestIds, setLinkedQuestIds] = useState<Set<string>>(new Set())
  const [parentTodo, setParentTodo] = useState<Todo | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUnlinking, setIsUnlinking] = useState(false)
  const quests = useQuestStore(s => s.quests)
  const placeholder = useMemo(() => getRandomWhyQuestion(), [])

  useEffect(() => {
    if (!open || !isOwner) return
    let ignore = false

    async function loadQuests() {
      const active = quests.filter(q => q.status === 'active' && q.user_id === todo.user_id)
      const res = await fetch(`/api/todos/${todo.id}/quests`)
      const questIds: string[] = res.ok ? await res.json() : []
      if (ignore) return
      setActiveQuests(active)
      const ids = new Set(questIds)
      setLinkedQuestIds(ids)
      setInitialLinkedQuestIds(new Set(ids))
    }

    loadQuests()
    return () => { ignore = true }
    // We only want to load once when the panel opens or if the todo changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isOwner, todo.id, todo.user_id])

  useEffect(() => {
    if (!open || !todo.parent_id) {
      setParentTodo(null)
      return
    }

    async function loadParent() {
      // Check store first
      const store = useTodoStore.getState()
      const found = [...store.myTodos, ...store.partnerTodos].find(t => t.id === todo.parent_id)
      if (found) {
        setParentTodo(found)
        return
      }

      // Fetch from API
      try {
        const res = await fetch(`/api/todos/${todo.parent_id}`)
        setParentTodo(res.ok ? await res.json() : null)
      } catch (err) {
        console.error('Failed to load parent todo:', err)
      }
    }

    loadParent()
  }, [open, todo.parent_id])

  function toggleQuestLink(questId: string) {
    setLinkedQuestIds(prev => {
      const next = new Set(prev)
      if (next.has(questId)) next.delete(questId)
      else next.add(questId)
      return next
    })
  }

  async function handleSave() {
    if (!editTitle.trim()) return

    // Block subtask due date that exceeds parent's due date
    if (todo.parent_id && editDueDate && parentTodo?.due_date && editDueDate > parentTodo.due_date) {
      toast.error(`Due date can't be after the parent task's deadline (${format(new Date(parentTodo.due_date + 'T00:00:00'), 'MMM d')})`)
      return
    }

    setIsSaving(true)

    try {
      await useTodoStore.getState().updateTodo(todo.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        due_date: editDueDate || null,
        recurrence: (editRecurrence as Recurrence) || null,
        energy_level: editEnergyLevel,
      })

      // Sync quest links
      const toAdd = [...linkedQuestIds].filter(id => !initialLinkedQuestIds.has(id))
      const toRemove = [...initialLinkedQuestIds].filter(id => !linkedQuestIds.has(id))

      await Promise.all([
        ...toAdd.map(qid => useQuestStore.getState().linkTask(qid, todo.id)),
        ...toRemove.map(qid => useQuestStore.getState().unlinkTask(qid, todo.id))
      ])

      // Regenerate metadata in background
      triggerAiMetadata(todo.id)

      onRefresh()
      onClose()
    } catch (err) {
      console.error('Error saving todo:', err)
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUnlink() {
    if (!isOwner) return
    setIsUnlinking(true)
    try {
      await useTodoStore.getState().updateTodo(todo.id, { parent_id: null })
      setParentTodo(null)
      onRefresh()
      toast.success('Task unlinked from parent')
    } catch (err) {
      console.error('Error unlinking todo:', err)
      toast.error('Failed to unlink task')
    } finally {
      setIsUnlinking(false)
    }
  }

  async function handleDelete() {
    try {
      await useTodoStore.getState().deleteTodo(todo.id)
      onRefresh()
      onClose()
    } catch (err) {
      console.error('Error deleting todo:', err)
      toast.error('Failed to delete task')
    }
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
            {/* Parent Todo */}
            {parentTodo && (
              <div className="flex items-center justify-between bg-foam rounded-xl px-4 py-2 -mt-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Subtask of</span>
                  <span className="text-sm font-medium truncate">{parentTodo.title}</span>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={handleUnlink}
                    disabled={isUnlinking}
                    className="text-xs font-semibold text-primary-dark hover:underline flex-shrink-0 ml-2 disabled:opacity-50"
                  >
                    {isUnlinking ? 'Unlinking...' : 'Unlink'}
                  </button>
                )}
              </div>
            )}

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
                placeholder={placeholder}
                rows={3}
                className="text-sm rounded-xl px-4 py-3 w-full focus:outline-none resize-none bg-card border-[1.5px] border-border text-foreground"
              />
            ) : (
              <p className="text-sm" style={{ color: todo.description ? 'var(--color-text)' : 'var(--color-text-disabled)' }}>
                {todo.description || 'No notes'}
              </p>
            )}

            {/* AI nudge */}
            {(todo.completed ? todo.completion_nudge : todo.motivation_nudge) && (
              <p
                className="text-sm italic rounded-xl px-4 py-3 w-full"
                style={{ background: 'var(--color-foam)', color: 'var(--color-primary-dark)' }}
              >
                {todo.completed ? todo.completion_nudge : todo.motivation_nudge}
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
                {(() => {
                  if (!todo.due_date) return 'No due date'
                  const date = parseISO(todo.due_date)
                  return isValid(date) ? format(date, 'MMMM d, yyyy') : 'Invalid date'
                })()}
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

            {/* Energy Level */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Energy</p>
              {isOwner ? (
                <div className="flex gap-2 flex-wrap">
                  {(['low', 'medium', 'high'] as const).map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setEditEnergyLevel(val)}
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition min-h-[36px]"
                      style={{
                        background: editEnergyLevel === val ? 'var(--color-primary)' : 'var(--color-foam)',
                        color: editEnergyLevel === val ? '#fff' : 'var(--color-text-secondary)',
                        border: editEnergyLevel === val ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border)',
                      }}
                    >
                      {val.charAt(0).toUpperCase() + val.slice(1)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm">
                  {((todo.energy_level || 'low') as string).charAt(0).toUpperCase() + ((todo.energy_level || 'low') as string).slice(1)}
                </p>
              )}
            </div>

            {/* Quest links */}
            {isOwner && activeQuests.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quests</p>
                <div className="flex flex-wrap gap-2">
                  {activeQuests.map(quest => {
                    const linked = linkedQuestIds.has(quest.id)
                    return (
                      <motion.button
                        key={quest.id}
                        layout
                        type="button"
                        onClick={() => toggleQuestLink(quest.id)}
                        whileTap={{ scale: 0.95 }}
                        initial={false}
                        style={{
                          backgroundColor: linked ? 'var(--color-primary)' : 'var(--color-foam)',
                          color: linked ? '#fff' : 'var(--color-text-secondary)',
                          borderColor: linked ? 'var(--color-primary)' : 'var(--color-border)',
                        }}
                        animate={{
                          scale: linked ? 1.05 : 1,
                        }}
                        transition={{ 
                          duration: 0.2, 
                          ease: "easeOut",
                          scale: { duration: 0.15 }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-[1.5px] min-h-[36px] cursor-pointer"
                      >
                        <QuestIcon name={quest.icon} size={14} />
                        <span>{quest.name}</span>
                        {linked && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-1"
                          >
                            ✓
                          </motion.span>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            {isOwner && (
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!editTitle.trim() || isSaving}
                  className="w-full font-semibold text-sm rounded-xl transition bg-primary text-primary-foreground min-h-[48px] flex items-center justify-center"
                  style={{ opacity: (editTitle.trim() && !isSaving) ? 1 : 0.4 }}
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
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
