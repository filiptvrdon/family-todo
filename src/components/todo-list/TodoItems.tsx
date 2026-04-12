'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Todo, QuestLink } from '@/lib/types'
import TodoCard from '@/components/TodoCard'

interface Section {
  label: string
  todos: Todo[]
  surfacedSubtasks?: Todo[]
}

interface TodoItemsProps {
  todos: Todo[]
  sections?: Section[]
  isOwner: boolean
  onToggle: (todo: Todo) => void
  onOpen: (todo: Todo) => void
  onEdit: (id: string, newTitle: string) => void
  questLinkMap: Record<string, QuestLink[]>
  streamingNudges: Map<string, string>
  loading: boolean
  isDragging?: boolean
  isSubtaskMode?: boolean
  expandedIds?: Set<string>
  onToggleExpand?: (id: string) => void
  renderSubList?: (todoId: string) => React.ReactNode
  parentTitleMap?: Record<string, string>
}

export function TodoItems({
  todos,
  sections,
  isOwner,
  onToggle,
  onOpen,
  onEdit,
  questLinkMap,
  streamingNudges,
  loading,
  isDragging = false,
  isSubtaskMode = false,
  expandedIds,
  onToggleExpand,
  renderSubList,
  parentTitleMap,
}: TodoItemsProps) {
  if (loading) {
    return <p className="text-sm text-center py-6 text-text-disabled">Loading tasks…</p>
  }

  if (todos.length === 0) {
    return <p className="text-sm text-center py-6 text-text-disabled">No tasks yet</p>
  }

  function renderTodo(todo: Todo, isSurfaced = false) {
    const isExpanded = expandedIds?.has(todo.id) ?? false
    const parentTitle = isSurfaced ? parentTitleMap?.[todo.id] : undefined
    return (
      <motion.div
        key={todo.id}
        className="flex flex-col"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <TodoCard
          todo={todo}
          isOwner={isOwner}
          onToggle={onToggle}
          onOpen={onOpen}
          onEdit={onEdit}
          isSortable={isOwner && !isSurfaced}
          isDraggable={isOwner && !isSurfaced}
          isDroppable={isOwner && !isSurfaced}
          isExpanded={isExpanded}
          onToggleExpand={() => onToggleExpand?.(todo.id)}
          isSubtaskMode={isSubtaskMode}
          quests={questLinkMap[todo.id]}
          streamingNudge={streamingNudges.get(todo.id)}
          parentTitle={parentTitle}
        />
        {isExpanded && renderSubList && (
          <div className="ml-8 mt-1 border-l border-border/40 pl-2">
            {renderSubList(todo.id)}
          </div>
        )}
      </motion.div>
    )
  }

  const gap = (isDragging && !isSubtaskMode) ? '16px' : '8px'

  return (
    <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
      {sections ? (
        <div className="flex flex-col gap-4">
          {sections.map(section => {
            const hasSurfaced = (section.surfacedSubtasks?.length ?? 0) > 0
            if (section.todos.length === 0 && !hasSurfaced) return null
            return (
              <div key={section.label} className="flex flex-col" style={{ gap }}>
                <p className="text-xs font-semibold uppercase tracking-wide px-1"
                  style={{ color: 'var(--color-text-secondary)' }}>
                  {section.label}
                </p>
                <AnimatePresence initial={false}>
                  {section.todos.map(todo => renderTodo(todo, false))}
                </AnimatePresence>
                {hasSurfaced && (
                  <AnimatePresence initial={false}>
                    {section.surfacedSubtasks!.map(todo => renderTodo(todo, true))}
                  </AnimatePresence>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap, transition: 'gap 0.15s ease' }}>
          <AnimatePresence initial={false}>
            {todos.map(todo => renderTodo(todo, !!(parentTitleMap && parentTitleMap[todo.id])))}
          </AnimatePresence>
        </div>
      )}
    </SortableContext>
  )
}
