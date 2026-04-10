# Feature: Subtle Priority System

> **File:** `019_subtle-priority.md`
> **Status:** draft

## What & Why

**Problem:** Complex priority systems (High, Medium, Low) often cause overthinking and "analysis paralysis" as users try to decide exactly how important a task is.
**Goal:** A binary priority system ("Important" or not) that is quick to set and provides clear visual cues.
**Not covered:** Multi-level priority labels or complex sorting algorithms.

## How It Works

### The "Important" Toggle
Tasks have a simple binary toggle: "Important".
- **Visuals:** A subtle star icon (⭐) or a distinct visual highlight on the task card.
- **Behavior:** Important tasks are prioritized in the "Now" layer (Spec 014) and appear higher in the task list by default.

### Why binary?
- Reduces the cognitive load of decision-making.
- Keeps the UI clean and minimalist.
- Avoids the "every task is high priority" trap that often happens with 3+ levels.

### UI Integration
- Toggle is available on the `TodoCard` (one click) and within the `TodoDetailPanel`.
- Visual highlight: A slightly different background tint or a small border for important tasks.

## Done When

- [ ] `is_important` boolean field added to the `todos` model.
- [ ] Toggle UI added to `TodoCard` (e.g. star icon).
- [ ] Visual highlight implemented for important tasks.
- [ ] "Now" layer (Spec 014) correctly prioritizes tasks tagged as important.
- [ ] Toggling priority is an optimistic update (instant UI change).

**Open questions**
- Should we limit the number of "Important" tasks a user can have active at once?
- Should partner-created "Important" tasks have a different visual style?

**Implementation notes**
- Use a boolean flag in the `todos` table.
- Default to `false` for all new tasks unless specifically set.
