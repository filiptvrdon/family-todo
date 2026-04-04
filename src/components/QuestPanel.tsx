'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ArrowLeft, Pin, PinOff, Plus, CheckCircle2 } from 'lucide-react'
import { Drawer } from '@base-ui/react'
import { Quest } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { QUEST_ICONS, QuestIcon } from '@/lib/questIcons'

interface LinkedTask {
  id: string
  title: string
  completed: boolean
}

interface Props {
  open: boolean
  userId: string
  initialQuestId?: string | null
  onClose: () => void
  onQuestsChanged: () => void
}

type View = 'list' | 'detail' | 'create'

export default function QuestPanel({ open, userId, initialQuestId, onClose, onQuestsChanged }: Props) {
  const [view, setView] = useState<View>('list')
  const [quests, setQuests] = useState<Quest[]>([])
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null)
  const [linkedTasks, setLinkedTasks] = useState<LinkedTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)

  // Create form state
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState(QUEST_ICONS[0].name)
  const [newDescription, setNewDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const loadQuests = useCallback(async () => {
    const { data } = await supabase
      .from('quests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setQuests(data ?? [])
  }, [supabase, userId])

  useEffect(() => {
    if (open) {
      loadQuests()
    }
  }, [open, loadQuests])

  useEffect(() => {
    if (open && initialQuestId && quests.length > 0) {
      const quest = quests.find(q => q.id === initialQuestId)
      if (quest) openDetail(quest)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuestId, quests])

  async function openDetail(quest: Quest) {
    setSelectedQuest(quest)
    setView('detail')
    setLoadingTasks(true)
    const { data } = await supabase
      .from('quest_tasks')
      .select('task_id, todos(id, title, completed)')
      .eq('quest_id', quest.id)
    const tasks = (data ?? []).map((row: { todos: LinkedTask | LinkedTask[] | null }) => {
      const t = Array.isArray(row.todos) ? row.todos[0] : row.todos
      return t as LinkedTask
    }).filter(Boolean)
    setLinkedTasks(tasks)
    setLoadingTasks(false)
  }

  async function togglePin(quest: Quest) {
    const pinned = quests.filter(q => q.pinned)
    if (!quest.pinned && pinned.length >= 3) return
    const newVal = !quest.pinned
    setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, pinned: newVal } : q))
    await supabase.from('quests').update({ pinned: newVal }).eq('id', quest.id)
    onQuestsChanged()
  }

  async function createQuest() {
    if (!newName.trim()) return
    setSaving(true)
    const { data } = await supabase.from('quests').insert({
      user_id: userId,
      name: newName.trim(),
      icon: newIcon,
      description: newDescription.trim() || null,
    }).select().single()
    if (data) {
      setQuests(prev => [data, ...prev])
      onQuestsChanged()
    }
    setNewName('')
    setNewIcon(QUEST_ICONS[0].name)
    setNewDescription('')
    setSaving(false)
    setView('list')
  }

  async function completeQuest() {
    if (!selectedQuest) return
    await supabase.from('quests').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      pinned: false,
    }).eq('id', selectedQuest.id)
    setQuests(prev => prev.filter(q => q.id !== selectedQuest.id))
    onQuestsChanged()
    setView('list')
    setSelectedQuest(null)
  }

  function progressProse(tasks: LinkedTask[]): string {
    const done = tasks.filter(t => t.completed).length
    if (tasks.length === 0) return 'No tasks linked yet.'
    if (done === 0) return 'Your journey begins — link tasks and start moving.'
    if (done === 1) return "You've taken your first step toward this."
    return `You've taken ${done} steps toward this.`
  }

  const activeQuests = quests.filter(q => q.status === 'active')
  const pinnedCount = quests.filter(q => q.pinned).length

  return (
    <Drawer.Root open={open} onOpenChange={val => { if (!val) { onClose(); setView('list'); setSelectedQuest(null) } }}>
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
        />
        <Drawer.Popup className="detail-panel-popup">
          <div className="overflow-y-auto h-full">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-text-disabled" />
            </div>

            {/* ── LIST VIEW ── */}
            {view === 'list' && (
              <div className="px-5 pb-8 pt-2 flex flex-col gap-5">
                <div className="flex items-center justify-between gap-3">
                  <Drawer.Title className="text-base font-semibold text-foreground">Quests</Drawer.Title>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setView('create')}
                      className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-full transition cursor-pointer"
                      style={{ background: 'var(--color-primary)', color: '#fff' }}
                    >
                      <Plus size={14} />
                      New
                    </button>
                    <Drawer.Close className="flex items-center justify-center rounded-full w-8 h-8 transition text-muted-foreground bg-foam cursor-pointer">
                      <X size={16} />
                    </Drawer.Close>
                  </div>
                </div>

                {activeQuests.length === 0 && (
                  <p className="text-sm text-center py-8 text-text-disabled">No active quests yet.<br />Create one to get started.</p>
                )}

                <div className="flex flex-col gap-2">
                  {activeQuests.map(quest => (
                    <div
                      key={quest.id}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 border border-border bg-card"
                    >
                      <button
                        onClick={() => openDetail(quest)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <span className="shrink-0 text-primary">
                          <QuestIcon name={quest.icon} size={18} />
                        </span>
                        <span className="text-sm font-medium text-foreground truncate">{quest.name}</span>
                      </button>
                      <button
                        onClick={() => togglePin(quest)}
                        title={quest.pinned ? 'Unpin from navbar' : pinnedCount >= 3 ? 'Unpin another quest first' : 'Pin to navbar'}
                        className="shrink-0 transition cursor-pointer"
                        style={{
                          color: quest.pinned ? 'var(--color-primary)' : 'var(--color-text-disabled)',
                          opacity: !quest.pinned && pinnedCount >= 3 ? 0.35 : 1,
                        }}
                      >
                        {quest.pinned ? <Pin size={16} /> : <PinOff size={16} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── CREATE VIEW ── */}
            {view === 'create' && (
              <div className="px-5 pb-8 pt-2 flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setView('list')}
                    className="flex items-center justify-center rounded-full w-8 h-8 transition text-muted-foreground bg-foam cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <Drawer.Title className="text-base font-semibold text-foreground">New Quest</Drawer.Title>
                </div>

                {/* Icon picker */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Icon</p>
                  <div className="grid grid-cols-6 gap-2">
                    {QUEST_ICONS.map(({ name, component: Icon }) => {
                      const selected = newIcon === name
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setNewIcon(name)}
                          className="flex items-center justify-center rounded-xl w-full aspect-square transition cursor-pointer"
                          style={{
                            background: selected ? 'var(--color-primary)' : 'var(--color-foam)',
                            color: selected ? '#fff' : 'var(--color-text-secondary)',
                            border: selected ? '1.5px solid var(--color-primary)' : '1.5px solid transparent',
                          }}
                        >
                          <Icon size={18} />
                        </button>
                      )
                    })}
                  </div>
                </div>

                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Quest name"
                  className="text-sm rounded-xl px-4 py-3 w-full focus:outline-none bg-card border-[1.5px] border-border text-foreground min-h-[44px] placeholder:text-text-disabled"
                />

                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="What's this quest about? (optional)"
                  rows={3}
                  className="text-sm rounded-xl px-4 py-3 w-full focus:outline-none resize-none bg-card border-[1.5px] border-border text-foreground placeholder:text-text-disabled"
                />

                <button
                  onClick={createQuest}
                  disabled={!newName.trim() || saving}
                  className="w-full font-semibold text-sm rounded-xl transition bg-primary text-primary-foreground min-h-[48px] cursor-pointer"
                  style={{ opacity: newName.trim() ? 1 : 0.4 }}
                >
                  {saving ? 'Creating…' : 'Create Quest'}
                </button>
              </div>
            )}

            {/* ── DETAIL VIEW ── */}
            {view === 'detail' && selectedQuest && (
              <div className="px-5 pb-8 pt-2 flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setView('list'); setSelectedQuest(null) }}
                    className="flex items-center justify-center rounded-full w-8 h-8 transition text-muted-foreground bg-foam cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-primary shrink-0">
                      <QuestIcon name={selectedQuest.icon} size={18} />
                    </span>
                    <Drawer.Title className="text-base font-semibold text-foreground truncate">{selectedQuest.name}</Drawer.Title>
                  </div>
                  <Drawer.Close className="flex-shrink-0 flex items-center justify-center rounded-full w-8 h-8 transition text-muted-foreground bg-foam cursor-pointer">
                    <X size={16} />
                  </Drawer.Close>
                </div>

                {selectedQuest.description && (
                  <p className="text-sm text-text-secondary">{selectedQuest.description}</p>
                )}

                {/* Progress prose */}
                <p
                  className="text-sm font-medium px-4 py-3 rounded-xl"
                  style={{ background: 'var(--color-foam)', color: 'var(--color-primary-dark)' }}
                >
                  {loadingTasks ? '…' : progressProse(linkedTasks)}
                </p>

                {/* Linked tasks */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Linked tasks</p>
                  {loadingTasks && <p className="text-sm text-text-disabled py-2">Loading…</p>}
                  {!loadingTasks && linkedTasks.length === 0 && (
                    <p className="text-sm text-text-disabled py-2">No tasks linked yet. Open a task and link it to this quest.</p>
                  )}
                  {!loadingTasks && linkedTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 text-sm py-2 border-b border-border last:border-0">
                      <CheckCircle2
                        size={16}
                        style={{ color: task.completed ? 'var(--color-completion)' : 'var(--color-text-disabled)', flexShrink: 0 }}
                      />
                      <span style={{
                        color: task.completed ? 'var(--color-text-disabled)' : 'var(--color-text)',
                        textDecoration: task.completed ? 'line-through' : 'none',
                      }}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Complete quest */}
                <button
                  onClick={completeQuest}
                  className="w-full text-sm rounded-xl transition min-h-[44px] border-[1.5px] mt-2 cursor-pointer"
                  style={{
                    color: 'var(--color-completion)',
                    borderColor: 'var(--color-completion)',
                  }}
                >
                  Mark quest as complete
                </button>
              </div>
            )}
          </div>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
