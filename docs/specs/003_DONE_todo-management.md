# Feature: Todo Management

> **Status:** done
> **Roadmap ref:** Core task model

## Problem

Partners need a shared place to capture, organize, and track tasks — from quick one-liners to structured recurring responsibilities — without cognitive overhead.

## Goal

Users can create, edit, complete, delete, and reorder tasks with minimal friction. Tasks support optional due dates, recurrence, scheduled times, and descriptions.

## Non-goals

- Task comments or activity history
- File attachments
- Multiple assignees per task (each task belongs to one owner)
- Complex priority levels (ordering handles priority implicitly)

## Design

### User-facing behavior

1. **Creating a task:** Type a title in the add-task input at the top of the list and press Enter (or tap the add button). No other fields required.
2. **Editing a task:** Tap/click a task card to open the **TodoDetailPanel** (a drawer). Edit title, description, due date, recurrence, and scheduled time there.
3. **Completing a task:** Tap the checkbox on the task card. Fires a celebration toast. If the task is recurring, the due date advances (daily → +1 day, weekly → +7 days, monthly → +1 month) and it stays in the list.
4. **Deleting a task:** Available in the detail panel via a delete button.
5. **Reordering tasks:** Drag tasks up/down within the list. Order is persisted via fractional indexing.
6. **Due dates:** Optional. Tasks with a past due date are shown with an "Overdue" indicator.
7. **Recurrence:** Optional. Choices: Daily, Weekly, Monthly. Completing a recurring task resets its due date instead of marking it done permanently.
8. **Scheduled time:** An HH:MM time field. When set, the task appears in the Day Timeline at that hour.

### UI / UX notes

- Task list lives in `TodoList` component, rendered inside `TaskBoard`.
- Each task is a `TodoCard`: shows title, due date badge, recurrence badge, sub-task progress bar (if applicable), drag handle, checkbox.
- Detail panel: `TodoDetailPanel` — full-screen drawer (Base UI), closes on swipe down or back button.
- Add task input: inline at the top of the list, auto-focused after adding.
- Celebration toasts: random message from a pool, 2-second duration, via Sonner.
- See `docs/design-adhd-principles.md` — minimal required fields, no overwhelming forms.

### Data model

Table: `todos`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | owner |
| `title` | text | required |
| `description` | text | optional |
| `completed` | boolean | default false |
| `due_date` | date | optional |
| `recurrence` | enum | `'daily' \| 'weekly' \| 'monthly' \| null` |
| `scheduled_time` | time | `HH:MM:SS`, optional |
| `parent_id` | uuid | null for root tasks; see subtasks spec |
| `index` | text | fractional index string for ordering |
| `created_at` | timestamptz | |

### API / Server actions

All CRUD via Supabase client:
- `insert` — new task with `user_id`, `title`, computed `index` (appended to end)
- `update` — any field edit; recurrence reset updates `due_date` and sets `completed = false`
- `delete` — hard delete
- `select` — root tasks only (`parent_id IS NULL`) on server load; sub-tasks loaded on demand

### State & client logic

- `useState(localTodos)` in `TodoList` for optimistic updates — UI updates before DB confirms.
- `generateKeyBetween()` from `fractional-indexing` library computes new `index` values on reorder.
- Recurrence reset logic lives in the complete handler: `new Date(due_date) + interval`.
- `toast()` from Sonner fires on completion with a random celebration message.

## Acceptance criteria

- [x] User can add a task with title only
- [x] User can open a task and edit all optional fields
- [x] Completing a non-recurring task marks it done
- [x] Completing a recurring task advances the due date and keeps it in the list
- [x] Deleting a task removes it permanently
- [x] Dragging tasks reorders them and order persists on reload
- [x] Overdue tasks show an indicator
- [x] Tasks with a scheduled time appear in the Day Timeline

## Open questions

_None — feature is complete._

## Implementation notes

- Fractional indexing avoids integer re-numbering on reorder — only the moved item's `index` changes.
- Optimistic updates in `TodoList` keep the UI fast; a `useCallback(refresh)` triggers `router.refresh()` to sync server state periodically.
- Recurrence reset runs client-side before the Supabase `update` call — no server action needed.
- `scheduled_time` is stored as a Postgres `time` type (`HH:MM:SS`); the UI displays only `HH:MM`.
