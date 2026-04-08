'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Todo, QuestLink } from '@/lib/types'
import TodoCard from '@/components/TodoCard'

interface TodoItemsProps {
  todos: Todo[]
  isOwner: boolean
  onToggle: (todo: Todo) => void
  onDelete: (id: string) => void
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
}

export function TodoItems({
  todos,
  isOwner,
  onToggle,
  onDelete,
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
}: TodoItemsProps) {
  if (loading) {
    return <p className="text-sm text-center py-6 text-text-disabled">Loading tasks…</p>
  }

  if (todos.length === 0) {
    return <p className="text-sm text-center py-6 text-text-disabled">No tasks yet</p>
  }

  return (
    <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: (isDragging && !isSubtaskMode) ? '16px' : '8px',
          transition: 'gap 0.15s ease',
        }}
      >
        <AnimatePresence initial={false}>
          {todos.map(todo => {
            const isExpanded = expandedIds?.has(todo.id) ?? false
            return (
              <motion.div
                key={todo.id}
                className="flex flex-col"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <TodoCard
                  todo={todo}
                  isOwner={isOwner}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onOpen={onOpen}
                  onEdit={onEdit}
                  isSortable={isOwner}
                  isDraggable={isOwner}
                  isDroppable={isOwner}
                  isExpanded={isExpanded}
                  onToggleExpand={() => onToggleExpand?.(todo.id)}
                  isSubtaskMode={isSubtaskMode}
                  quests={questLinkMap[todo.id]}
                  streamingNudge={streamingNudges.get(todo.id)}
                />
                {isExpanded && renderSubList && (
                  <div className="ml-8 mt-1 border-l border-border/40 pl-2">
                    {renderSubList(todo.id)}
                  </div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </SortableContext>
  )
}
