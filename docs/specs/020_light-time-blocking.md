# Feature: Light Time Blocking

> **File:** `020_light-time-blocking.md`
> **Status:** draft

## What & Why

**Problem:** Users plan tasks for the day but don't allocate specific time for them, leading to an unrealistic workload and tasks being left undone.
**Goal:** A "light" version of time blocking that allows users to drag a task into a specific calendar slot to commit to a time.
**Not covered:** Full Google Calendar bi-directional sync (handled in Spec 007) or complex time optimization algorithms.

## How It Works

### Drag Task to Calendar
In the "Day" or "Timeline" view, users can drag a task card directly into a time slot on the calendar.
- **Action:** Dragging a task onto the "10:00 AM" slot.
- **Result:** The task's `scheduled_time` is set to `10:00 AM`.
- **UI:** The task card now appears in that calendar slot as a time block.

### Visual Planning
- Seeing tasks as blocks of time on a timeline makes the schedule "real" and helps users spot over-commitment.
- Resizing the task block on the calendar could potentially update the task duration (if duration is added later).

## Done When

- [ ] Drag-and-drop integration between the `TodoList` and the `CalendarTimeline` component.
- [ ] Task `scheduled_time` is updated upon drop.
- [ ] Dropped task appears correctly as a block in the calendar timeline.
- [ ] Drag-and-drop works on both desktop (mouse) and mobile (touch - see Spec 009).

**Open questions**
- Should tasks have a default duration (e.g. 30 minutes) when dropped onto the calendar?
- Can we automatically move other tasks if they overlap? (Avoid complexity initially).

**Implementation notes**
- Use `@dnd-kit` (already used in the project) for cross-component drag and drop.
- Update only the `scheduled_time` field in the database.
