# Feature: Calendar Suite

> **Status:** done
> **Roadmap ref:** Schedule / calendar views

## Problem

A flat task list has no temporal context. Users need to see their tasks in time — what's happening today, this week, this month — and be able to schedule tasks by dragging, not by filling forms.

## Goal

Three calendar views (Day, Week, Month) let users see tasks and events in time and drag tasks to schedule them.

## Non-goals

- Calendar event editing (events are currently create/view only)
- Recurring calendar events (different from recurring todos)
- Calendar sharing (partner's events are visible but not editable)
- Time zones (app assumes local time throughout)

## Design

### User-facing behavior

**Shared behavior across all views:**
- Displays both the user's `calendar_events` and their Google Calendar events (if connected).
- Displays the partner's events too (read-only, visually distinguished by color).
- Todos with a `due_date` or `scheduled_time` appear in the relevant slot.
- Dragging a todo onto a slot updates the todo in the DB.

**Day View (`DayTimeline`):**
- Hours 5 AM – 8 PM displayed as rows.
- Current hour highlighted.
- Auto-scrolls to current hour on mount.
- Todos with `scheduled_time` appear in the matching hour row.
- Dragging a todo to an hour sets `scheduled_time = HH:00:00`.
- Checkbox on each todo item to complete in-place.
- Also used inside the Daily Check-In modal.

**Week View (`WeekCalendar`):**
- 7-column grid (Mon–Sun), rows for hours (5 AM – 8 PM).
- Navigate weeks with prev/next buttons and a "Today" shortcut.
- Drag a todo to any hour-cell to set `due_date` + `scheduled_time`.
- Click a cell to open a **NewEventForm** inline to create a `calendar_event`.
- Events rendered as colored chips (`EventChip`) — user's color vs. partner's color.

**Month View (`MonthCalendar`):**
- Standard month grid.
- Navigate months with prev/next.
- Drag a todo to a day cell to set `due_date` only (no scheduled time).
- Small dot indicators per day showing todo count.
- Click a day to see its full detail.

**CalendarSuite container:**
- Tab bar: Day / Week / Month.
- Hosts all three views; renders the active one.
- Shown in the right panel on desktop; in the "Schedule" tab on mobile.

### UI / UX notes

- `EventChip`: colored pill with title, truncated. User events = primary color, partner events = accent color.
- `TodoDot`: small circle indicator on month cells.
- `CalendarNav`: prev/next arrows + "Today" button, shared across week/month views.
- Empty hours in day/week views are styled as subtle drop targets when dragging.
- See `docs/design-visual-guidelines.md` for color conventions.

### Data model

Table: `calendar_events`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | owner |
| `title` | text | |
| `description` | text | optional |
| `start_time` | timestamptz | |
| `end_time` | timestamptz | |
| `all_day` | boolean | |
| `created_at` | timestamptz | |

Todos are read from the existing `todos` table filtered by `due_date` or `scheduled_time`.

### API / Server actions

- `calendar_events` CRUD via Supabase client.
- Todos updated via Supabase `update` on drag-end (sets `due_date` and/or `scheduled_time`).
- Google Calendar events fetched server-side on page load and passed as props (see `google-calendar-sync` spec).

### State & client logic

- `useCalendarData(date, todos, events, googleEvents)` — custom hook that groups all data by hour/day for rendering.
- `useDroppable({ id: 'hour-HH' })` per hour slot in Day view.
- `useDroppable({ id: 'week-YYYY-MM-DD-HH' })` per cell in Week view.
- `useDroppable({ id: 'month-day-YYYY-MM-DD' })` per cell in Month view.
- DragEnd handler in `Dashboard` inspects the `over.id` prefix to determine which view handled the drop and updates the todo accordingly.
- `useState(currentDate)` for week/month navigation.

## Acceptance criteria

- [x] Day view shows todos with scheduled times in the correct hour slot
- [x] Dragging a todo to a day-view hour sets its scheduled time
- [x] Week view shows all events and todos across 7 days
- [x] Dragging a todo to a week cell sets due date and scheduled time
- [x] Month view shows todos on their due dates
- [x] Dragging a todo to a month cell sets its due date
- [x] Week and month views have working prev/next navigation
- [x] New calendar events can be created from the week view
- [x] Partner events are visible and color-coded differently

## Open questions

_None — feature is complete._

## Implementation notes

- `DayTimeline` is reused in two places: the CalendarSuite and the Daily Check-In modal. It accepts `todos` and `events` as props so both contexts can provide their own data.
- All three views share the same DnD context from `Dashboard.tsx` — drop target IDs are prefixed (`hour-`, `week-`, `month-day-`) to disambiguate in the single `onDragEnd` handler.
- `useCalendarData` is the key complexity point — it merges todos, app calendar events, and Google Calendar events into a unified data structure keyed by date/hour.
- Google Calendar events are plain objects (not DB rows) — they have a different shape and are only read, never written.
