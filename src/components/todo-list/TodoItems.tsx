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
  loading
}: TodoItemsProps) {
  if (loading) {
    return <p className="text-sm text-center py-6 text-text-disabled">Loading tasks…</p>
  }

  if (todos.length === 0) {
    return <p className="text-sm text-center py-6 text-text-disabled">No tasks yet</p>
  }

  return (
    <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
      <AnimatePresence initial={false}>
        {todos.map(todo => (
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
              onToggle={onToggle}
              onDelete={onDelete}
              onOpen={onOpen}
              onEdit={onEdit}
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
  )
}
