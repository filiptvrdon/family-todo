
import { closestCenter, pointerWithin, CollisionDetection } from '@dnd-kit/core'

/**
 * Two-mode collision detection:
 * - Pointer directly on a card → subtask creation (card highlights)
 * - Pointer in the gap between cards → reorder (SortableContext shows insertion gap)
 *
 * Uses `pointerWithin` first: only matches when the pointer is inside a droppable's
 * bounding rect. SortableContext translates items during drag to open a visual gap,
 * so the gap area has no card underneath — `pointerWithin` returns nothing there,
 * and we fall back to `closestCenter` (sortable items only) for reordering.
 */
export const subtaskCollisionDetection: CollisionDetection = (args) => {
  // 1. Check if pointer is within a todo drop target (subtask zone)
  const pointerCollisions = pointerWithin(args)
  const subtaskTarget = pointerCollisions.find(
    (c) => String(c.id).startsWith('todo-')
  )

  if (subtaskTarget) {
    return [subtaskTarget]
  }

  // 2. Pointer is in a gap — fall back to closestCenter for reorder.
  //    Exclude todo-drop-target droppables so only sortable IDs (plain UUIDs) win.
  return closestCenter(args).filter(
    (c) => !String(c.id).startsWith('todo-')
  )
}
