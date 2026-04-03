# Feature: Drag-and-Drop

> **Status:** done
> **Roadmap ref:** n/a (infrastructure)

## Problem

Scheduling tasks by filling in date/time form fields is slow and breaks flow. Assigning a task to a time should feel as natural as moving a sticky note.

## Goal

Users can drag tasks to reorder them, schedule them to specific times, assign due dates, and promote them to sub-tasks — all without opening a form.

## Non-goals

- Touch-based long-press drag on all devices (dnd-kit PointerSensor covers this)
- Drag between users (partner tasks are read-only)
- Multi-select drag

## Design

### User-facing behavior

Four drag interactions:

| Drag from | Drop target | Result |
|---|---|---|
| Task list | Another position in the same list | Reorder (fractional index updated) |
| Task list | Hour slot in Day/Week timeline | Sets `scheduled_time = HH:00:00` |
| Task list | Day cell in Week/Month calendar | Sets `due_date`; Week also sets `scheduled_time` |
| Task list | Another task card | Promotes dragged task to sub-task of target |

During drag:
- Dragged item becomes semi-transparent in place (opacity reduced).
- A `DragOverlay` ghost shows the card floating under the cursor.
- Valid drop targets highlight on hover.

### UI / UX notes

- Drag handle icon on each `TodoCard` (visible on hover/focus on desktop, always visible on mobile).
- Activation distance: 8px (prevents accidental drags on tap).
- `DragOverlay` renders a simplified card clone — same width as the original.
- Drop zones in calendar views have a subtle highlight when a draggable hovers over them.

### Data model

No new columns — updates existing fields:
- `todos.index` — fractional string, updated on reorder
- `todos.scheduled_time` — time, updated on timeline drop
- `todos.due_date` — date, updated on calendar drop
- `todos.parent_id` + `todos.index` — updated on sub-task promotion

### API / Server actions

All DB updates via Supabase client `update` on `onDragEnd`.

### State & client logic

**Libraries:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `fractional-indexing`

**DnD contexts:**
- `Dashboard.tsx` — main context wrapping the entire app layout; handles all cross-component drops.
- `CheckIn.tsx` — isolated context within the check-in modal (checklist reorder + timeline drops).
- `TodoList.tsx` — optional inner context for same-list reordering.

**Droppable ID conventions:**
| Prefix | Example | Meaning |
|---|---|---|
| `hour-` | `hour-9` | Day view hour slot (9 AM) |
| `week-` | `week-2024-03-15-14` | Week view cell (date + hour) |
| `month-day-` | `month-day-2024-03-15` | Month view day cell |
| _(todo uuid)_ | `abc-123-...` | Another task card (sub-task target) |

**`onDragEnd` logic in `Dashboard.tsx`:**
1. If `over.id` starts with `hour-` → update `scheduled_time`.
2. If `over.id` starts with `week-` → update `due_date` + `scheduled_time`.
3. If `over.id` starts with `month-day-` → update `due_date`.
4. If `over.id` is a todo UUID (different from active) → update `parent_id` + `index`.
5. If `over.id` is within the same sortable list → update `index` only (reorder).

**Hooks per component:**
- `useDraggable` — makes `TodoCard` draggable.
- `useDroppable` — marks calendar cells and hour slots as drop targets.
- `useSortable` — combines drag + drop for same-list reordering in `TodoList`.
- `useDndMonitor` — lets inner components observe drag state without owning the context.
- `useSensors` + `PointerSensor` — configured with 8px activation distance.

`useState(draggingTodoId)` tracks the active drag to render the `DragOverlay` and hide the in-place ghost.

## Acceptance criteria

- [x] Dragging within the task list reorders tasks and persists on reload
- [x] Dragging to a day-view hour sets scheduled time
- [x] Dragging to a week-view cell sets due date and scheduled time
- [x] Dragging to a month cell sets due date only
- [x] Dragging one task onto another makes it a sub-task
- [x] DragOverlay ghost follows the cursor during drag
- [x] Dragged item is visually dimmed in its original position

## Open questions

_None — feature is complete._

## Implementation notes

- The single `onDragEnd` in `Dashboard.tsx` is the source of truth for all drop logic. Adding a new drop target type requires: (1) a new ID prefix, (2) a new branch in `onDragEnd`.
- dnd-kit's `PointerSensor` handles both mouse and touch — no separate mobile drag setup needed.
- `fractional-indexing`'s `generateKeyBetween(a, b)` generates a string between two existing index values; only the moved item's `index` is updated (not the whole list).
- The `CheckIn` modal has its own isolated `DndContext` to avoid interfering with the main Dashboard context while the modal is open.
