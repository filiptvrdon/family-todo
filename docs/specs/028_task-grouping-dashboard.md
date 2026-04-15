# Feature: Dashboard Task Grouping

> **File:** `028_task-grouping-dashboard.md`
> **Status:** done

## What & Why

The dashboard currently shows a flat list of tasks for the selected date, including overdue and inbox tasks. To improve organization and focus, tasks should be grouped into time-based sections (Today, Tomorrow, This Week, Next Week, Later) relative to the date selected in the dashboard.

## How It Works

### 1. Categories relative to `dayDate`

Let `refDate` be the currently selected date in the dashboard (from `dayDate` prop).
Let `tomorrow` = `refDate + 1 day`.
Let `endOfThisWeek` = `endOfWeek(refDate, { weekStartsOn: 1 })` (Sunday).
Let `endOfNextWeek` = `endOfThisWeek + 7 days`.

The tasks should be grouped as follows:

- **Today**:
    - `due_date === format(refDate, 'yyyy-MM-dd')`
    - OR `(due_date < format(refDate, 'yyyy-MM-dd') AND completed === false)` (Overdue) 
    - tasks with no due date should be grouped under "Later"
- **Tomorrow**:
    - `due_date === format(tomorrow, 'yyyy-MM-dd')`
- **This Week**:
    - `due_date > format(tomorrow, 'yyyy-MM-dd')` AND `due_date <= format(endOfThisWeek, 'yyyy-MM-dd')`
- **Next Week**:
    - `due_date > format(endOfThisWeek, 'yyyy-MM-dd')` AND `due_date <= format(endOfNextWeek, 'yyyy-MM-dd')`
- **Later**:
    - `due_date > format(endOfNextWeek, 'yyyy-MM-dd')`
    - OR `due_date === null` (Unscheduled / Inbox)

### 2. Sorting

Within each group (and across groups where applicable), tasks must be sorted:
1. **By due date ASC** (earliest first).
2. **By scheduled time ASC** (if present).
3. **Unscheduled tasks** (those without `due_date`) must appear last in the "Later" section.

### 3. Visibility and Completed Tasks

- Completed tasks should only show up in the "Today" section if they were completed on `refDate` or if they were due on `refDate`.
- The current logic in `TodoList.tsx` for filtering visible tasks should be preserved/updated to ensure only relevant tasks appear in these groupings.

### 4. Component Updates

- **TodoList.tsx**: The `todoSections` useMemo should be updated to calculate these ranges relative to `dayDate`.
- **TodoItems.tsx**: Already supports sections, so it should render them as provided.

## Done When

- [x] Tasks are correctly grouped into five sections: Today, Tomorrow, This Week, Next Week, Later.
- [x] Grouping is relative to the selected date in the dashboard.
- [x] Overdue tasks appear in the "Today" section.
- [x] Unscheduled tasks appear last in the "Later" section.
- [x] Tasks are sorted by due date ASC.
- [x] The feature works even when the selected date is not today's actual date.
- [x] `npm run build && npm run lint` pass.

## Open Questions

- Should we show empty sections? (Proposed: No, only show sections that contain at least one task, as current `TodoItems` logic does).
- How should subtasks with due dates be handled? (Proposed: Keep current logic where they surface in the relevant time-bucket).

## Implementation Notes

- Use `date-fns` for all date calculations to ensure consistency (especially `endOfWeek` with `weekStartsOn: 1`).
- Ensure `todoSections` is not `undefined` when `dayDate` is present, regardless of whether it's today's actual date.
- **Finding:** `localTodos` was modified to include all incomplete tasks, enabling their categorization into future sections (Tomorrow, This Week, etc.) regardless of the currently selected dashboard date.
- **Finding:** Subtasks with due dates are surfaced and categorized in the same way as root tasks. They are interleaved with regular tasks within each section and sorted together by due date and scheduled time.
- **Finding:** `TodoItems` uses `parentTitleMap` to detect surfaced subtasks and render their parent task title.
- **Finding:** `displayTodos` (the full list passed to `SortableContext`) now includes both regular tasks and surfaced subtasks to ensure consistent rendering and dnd-kit behavior.
- **Finding:** Overdue tasks are automatically caught by the `due_date <= refDateStr` condition and placed in "Today".
- **Finding:** Sorting within each section uses `sortByDateTime` (Due Date ASC, then Scheduled Time ASC, with unscheduled tasks last). Since unscheduled tasks only appear in "Later", they naturally come at the bottom of the entire list.
