# Feature: Subtask Deadlines

> **File:** `025_subtask-deadlines.md`
> **Status:** done

## What & Why

Subtasks currently have no due dates. If a large task is due at end of next month but one subtask must be done today and another tomorrow, there's no way to surface those urgencies — they're buried inside the parent's detail panel.

**Goal:** Subtasks can have their own due dates, and they surface in the main todo list under the appropriate time-bucket heading ("Today", "This week", etc.) alongside root tasks.

**Explicitly does NOT cover:**
- Subtasks overriding or replacing the parent task in the list (parent still appears under its own deadline bucket)
- Subtask deadlines that fall *after* the parent's deadline (we may warn, but won't block)
- More than one level of nesting

## How It Works

### Data model

Add `due_date` column to the `todos` table (already exists for root tasks — subtasks just never used it). No schema change needed if the column is already nullable on all rows. Confirm via migrations.

### User flow

1. User opens a parent task's detail panel.
2. In the subtask list, each subtask row has a small date-picker button (same pattern as root task due dates).
3. User sets a due date on a subtask.
4. The subtask now appears **in the main todo list** under the correct time-bucket heading, in addition to appearing inside the parent's detail panel.
5. The subtask card in the main list shows:
   - Its own title
   - A "↳ Parent Task Name" label below the title so the user knows it belongs to a larger task
   - Its due date chip (same as root tasks)
   - No progress bar (it has no children)
6. Completing the subtask from the main list marks it complete everywhere (detail panel + parent progress bar update).

### Time-bucket logic

Reuse the existing heading bucketing logic:
- **Today** — due today
- **This week** — due within the next 7 days (excluding today)
- **Later** — due beyond 7 days
- Subtasks with no due date do NOT appear in the main list (only inside the parent panel, as today)

### UI / UX notes

- "↳ Parent Task Name" label: small, muted text below the subtask title — visually subordinate, not a distraction.
- On mobile, the date-picker in the subtask row should be a native date input or a bottom-sheet picker (consistent with root task pattern).
- ADHD consideration: surfacing urgent subtasks prevents them from being forgotten inside a collapsed parent. The parent label provides enough context without requiring the user to remember the hierarchy.

## Done When

- [x] Subtasks accept a `due_date` via the detail panel subtask row
- [x] Subtasks with a due date appear in the main todo list under the correct time-bucket heading
- [x] Each surfaced subtask card shows a "↳ Parent Task Name" attribution label
- [x] Completing from the main list marks the subtask complete and updates the parent's progress bar
- [x] Subtasks without a due date do NOT appear in the main list
- [x] Parent task still appears under its own deadline bucket regardless of subtask deadlines
- [x] Existing subtask behavior (reorder, delete, progress bar, drag-to-promote) is unaffected

**Open questions (resolved)**
- `due_date` is already nullable on all `todos` rows (including subtasks) — no migration needed.
- Subtasks with a due date are mixed with root tasks by due_date within each bucket (user preference).
- If subtask due_date > parent due_date: show toast error and block save.

**Implementation notes**
- No DB migration needed — `todos.due_date` is nullable for all rows (confirmed via `20260328070639_create_schema.sql`).
- Surfaced subtasks are rendered outside the DnD `SortableContext` (separate `surfacedSubtasks` array on each section) so they never interfere with root-task drag ordering.
- Parent title is passed via `parentTitleMap: Record<string, string>` from `TodoList` → `TodoItems` → `TodoCard` → `TodoDisplay`.
- Deadline validation happens in `TodoDetailPanel.handleSave` — compares `editDueDate` to `parentTodo.due_date`.
