# Feature: Focus Mode

> **Status:** done
> **Roadmap ref:** Focus mode / "just tell me what to do"

## Problem

Choice paralysis is real — especially for ADHD users. Presenting a full task list to someone who just wants to know "what should I do right now?" causes friction and avoidance.

## Goal

A single-task view that surfaces the most important next task and lets users act on it — done, skip, or postpone — without seeing the rest of the list.

## Non-goals

- Pomodoro timer or body-doubling mode (future feature)
- AI-driven task selection (current selection is algorithmic)
- Showing both partners' focus simultaneously

## Design

### User-facing behavior

1. Tap the "Focus" tab (mobile) or switch to focus panel (desktop).
2. A single task card appears — the algorithm selects it (see below).
3. Card shows: task title, owner badge, due date (with "Overdue" badge if past), recurrence badge.
4. Three actions:
   - **Done** — marks the task complete (triggers recurrence reset if applicable), shows celebration emoji briefly, then surfaces the next task.
   - **Skip** — hides this task for the rest of the day (stored in session storage, expires at midnight). Surfaces next task.
   - **Later** — postpones the task by 1 day (updates `due_date + 1`). Surfaces next task.
5. When no tasks remain: "You're all clear" message with a celebration.

**Selection algorithm (`selectTask`):**
Priority order:
1. Overdue tasks first (sorted by oldest due date)
2. Tasks due today
3. Tasks with no due date (sorted by `created_at`, oldest first)

Skipped task IDs (session storage, reset daily) are excluded from selection.

Both the user's and partner's tasks are included in the pool — ownership badge distinguishes them.

### UI / UX notes

- Large, centered card — nothing else visible, no list, no sidebar distraction.
- Title in large type; metadata below in smaller, muted text.
- Three action buttons below the card: Done (primary), Skip (ghost), Later (ghost).
- Brief celebration emoji animation on completion before next task appears.
- "You're all clear" end state: celebratory icon + message, no further actions.
- See `docs/design-adhd-principles.md` — single focus, no choice paralysis, positive reinforcement.

### Data model

Reads from existing `todos` table — no new columns.

Writes:
- `completed = true` on Done (+ recurrence reset if applicable)
- `due_date = due_date + 1` on Later

### API / Server actions

- All reads/writes via Supabase client directly (no custom route).
- Same todo array as the rest of the app — Focus Mode filters/sorts in-memory.

### State & client logic

- `useMemo(task)` — derives the current focus task from `todos` and `skipped` set on every render.
- `useState(skipped)` — `Set<string>` of task IDs; initialized from `sessionStorage` key `focus-skipped-YYYY-MM-DD`; cleared automatically when date changes.
- `useState(completing)` — boolean to prevent double-submission during the completion animation.
- `selectTask(todos, skipped)` — pure function, multi-criteria sort, returns first non-skipped task or null.

## Acceptance criteria

- [x] Focus mode shows exactly one task at a time
- [x] Task selection follows the priority order (overdue → today → undated)
- [x] Done marks the task complete and surfaces the next
- [x] Recurring task done advances due date instead of completing permanently
- [x] Skip hides the task for the current day only
- [x] Later postpones the task by one day
- [x] "All clear" state appears when no tasks remain
- [x] Partner tasks are included with an ownership badge

## Open questions

_None — feature is complete._

## Implementation notes

- Skipped state is in `sessionStorage` (not `localStorage`) so it naturally resets on browser close and a new day starts fresh.
- The daily key `focus-skipped-YYYY-MM-DD` means no explicit "reset at midnight" logic is needed — a new day produces a new key.
- `completing` guard prevents the Done button from firing twice during the async DB update + animation window.
- Focus mode operates on the same `todos` prop as the rest of the dashboard — no separate data fetch.
