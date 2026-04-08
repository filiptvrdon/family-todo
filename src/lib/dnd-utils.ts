
import { closestCenter, pointerWithin, CollisionDetection } from '@dnd-kit/core'

/**
 * Strict mode collision detection:
 * - If allowSubtasks is true (CTRL/CMD held): ONLY return todo-drop-target collisions.
 * - If allowSubtasks is false: ONLY return sortable item collisions (reorder mode).
 */
export const subtaskCollisionDetection = (args: any, allowSubtasks: boolean = false) => {
  if (allowSubtasks) {
    // Mode 1: Subtask assignment ONLY
    const pointerCollisions = pointerWithin(args)
    const subtaskTarget = pointerCollisions.find(
      (c) => String(c.id).startsWith('todo-')
    )
    return subtaskTarget ? [subtaskTarget] : []
  }

  // Mode 2: Reordering ONLY
  // Exclude todo-drop-target droppables so only sortable IDs (plain UUIDs) win.
  return closestCenter(args).filter(
    (c) => !String(c.id).startsWith('todo-')
  )
}
