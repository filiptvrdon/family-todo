# Feature: Sub-tasks

> **Status:** done
> **Roadmap ref:** n/a

## Problem

Some tasks are too large to treat as atomic units. Breaking them into steps helps users make progress without feeling overwhelmed by a single large item.

## Goal

Any task can have child tasks. Progress is visualized on the parent card. Sub-tasks are managed in the detail panel.

## Non-goals

- More than one level of nesting (sub-tasks cannot have their own sub-tasks)
- Sub-tasks with independent due dates or recurrence
- Converting a sub-task back to a root task via the UI (possible via DB but no UI)

## Design

### User-facing behavior

1. Open a task's detail panel (`TodoDetailPanel`).
2. A sub-task list with an add-input appears below the task details.
3. Add sub-tasks by typing a title and pressing Enter.
4. Sub-tasks can be reordered by drag-and-drop within the panel.
5. Complete sub-tasks via checkbox (same mechanic as root tasks).
6. Delete sub-tasks from the panel.
7. On the parent **TodoCard**, a progress bar appears showing `completed / total` sub-tasks.
8. An encouragement message (e.g., "You've got this!" / "Half way there!") appears below the bar, keyed deterministically to the task (not random) to avoid flickering.
9. Dragging a root task **onto** another root task in the main list promotes the dragged task to a sub-task of the target.

### UI / UX notes

- Sub-task list is rendered by reusing `TodoList` with a `parentId` prop.
- Progress bar: thin colored bar below the task title on `TodoCard`.
- Encouragement messages: three pools — start, in-progress, done — selected by a deterministic hash of the todo ID to keep message stable across renders.
- See `docs/design-adhd-principles.md` — progress visibility and positive reinforcement.

### Data model

Reuses the `todos` table:
- `parent_id` — uuid referencing the parent todo's `id`. Null for root tasks.
- `index` — fractional index within siblings of the same parent.
- Sub-task count cached via Supabase aggregation query: `select count(*) from todos where parent_id = :id`.

No separate table needed.

### API / Server actions

- `select * from todos where parent_id = :id order by index` — load sub-tasks on demand.
- `insert` — new sub-task with `parent_id` set.
- `update` — completion, reorder (index), title edit.
- `delete` — hard delete sub-task.
- Drag-onto-task: `update set parent_id = :targetId, index = :newIndex` on the dragged task.

### State & client logic

- `TodoList` accepts an optional `parentId` prop; when provided it loads and manages sub-tasks instead of root tasks.
- `useMemo(subtaskTotals)` in parent component caches `{ total, completed }` counts.
- `useMemo(encouragement)` selects message pool deterministically: `hash(todo.id) % pool.length`.
- `useState(draggingTodoId)` in the DnD context detects drop-onto-task to trigger sub-task promotion.

## Acceptance criteria

- [x] Sub-tasks are created in the detail panel
- [x] Sub-task progress bar appears on the parent card
- [x] Encouragement message changes based on completion ratio
- [x] Sub-tasks can be reordered by drag within the panel
- [x] Dragging one root task onto another makes it a sub-task
- [x] Sub-tasks are deleted independently without affecting the parent

## Open questions

_None — feature is complete._

## Implementation notes

- Only one level of nesting is enforced by UI convention (no `parent_id` field shown in sub-task detail panel), not by DB constraint. A future constraint could be added if needed.
- Sub-task counts on the server load (`/src/app/page.tsx`) use Supabase's aggregation syntax: `todos(count)` nested in the query — this avoids N+1 fetches.
- The drag-onto detection in `Dashboard.tsx` checks if the `over.id` matches a todo ID (not a droppable zone ID) to distinguish reorder from sub-task promotion.
