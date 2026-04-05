# Feature: Soft Deadlines & Anti-Overwhelm UI

> **File:** `016_soft-deadlines-and-anti-overwhelm.md`
> **Status:** draft

## What & Why

**Problem:** Traditional todo apps use rigid, red "Overdue" markers that cause stress and guilt (especially for ADHD users), leading to task avoidance.
**Goal:** Introduce "Soft Deadlines" that roll forward without guilt, and an "Anti-Overwhelm" UI that collapses long task lists to keep the screen calm.
**Not covered:** Complex scheduling or removal of overdue logic for tasks where it *does* matter (e.g. bills).

## How It Works

### Soft Deadlines (Flexible Planning)
Tasks can be tagged as "Flexible" or "Planned for Today".
- **"Planned for Today":** If not completed, it automatically rolls forward to tomorrow.
- **Visuals:** Replace the red "Overdue" text with "Still open" or "Carry over" for flexible tasks.
- **Binary choice:** Keep it simple — a task is either scheduled for a specific time or it's "Flexible".

### Anti-Overwhelm Rule
When a task list (or a specific quest's task group) contains more than a set number of tasks (e.g. 5–8):
- Only the first few are shown.
- Remaining tasks are collapsed into a single line: `+12 more tasks`.
- The user must manually expand to see the full list.
- This keeps the visual field clear and reduces cognitive load.

### UI behavior
- The collapse state is remembered per view session.
- Expanding is a simple click/tap.
- "Now" suggestions always remain visible above the collapsed list.

## Done When

- [ ] "Flexible" vs "Planned for Today" distinction added to the task model.
- [ ] Auto-roll forward logic implemented for tasks that aren't completed by end-of-day.
- [ ] "Overdue" label updated to "Still open" or similar for non-critical tasks.
- [ ] Collapsing logic added to `TodoList` to hide extra tasks beyond the threshold.
- [ ] `+X more tasks` button expands the list.

**Open questions**
- What is the ideal threshold for collapsing tasks?
- Should critical tasks (e.g. "Bill due") be immune to the "Anti-Overwhelm" collapse?

**Implementation notes**
- Update the `due_date` at midnight if the task is "Planned for Today" but not done.
- Use a `showAll` state in the `TodoList` component for the anti-overwhelm behavior.
