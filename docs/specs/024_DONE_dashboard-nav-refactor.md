# Feature: Dashboard & Nav Refactor

> **File:** `024_dashboard-nav-refactor.md`
> **Status:** done

## What & Why

A set of UI simplifications to reduce cognitive load and clarify app structure. The app has grown several features that now need to be reorganized into clear top-level views (Dashboard, Calendar, Quests) with cleaner section headers and removed clutter.

Does NOT cover: any data model changes, backend logic, or new features.

## How It Works

### 1. Unified section headers

Every section on the dashboard (Habits, Tasks, etc.) must use the same header style currently used by the Habits section — a label on the left with a `+` action button on the right. No other header styles should remain.

### 2. Tasks section

- Remove the user-switcher tabs (Filip / tvrdon.olga) from the top of the Tasks section.
- Replace it with a plain "Tasks" section header matching the unified style above.
- Remove the inline "Add a task…" text input row entirely.
- The `+` button in the Tasks section header becomes the sole entry point for creating a new task (reuse the task edit form also for creation).

### 3. Remove Focus Mode

- Remove the Focus Mode button/toggle from the navbar and from any other surface it appears on.
- Delete or disable the Focus Mode feature entirely — no entry point should remain.
- Mark spec `008_focus-mode.md` as `done` (superseded — removed).

### 4. Remove pinned quests from navbar

- Remove pinned/shortcut quest items from the navbar.
- Quest access is only via the dedicated Quests nav item (see below).

### 5. Navbar restructure

Replace the current navbar items with exactly three:

| Label | Destination |
|-------|-------------|
| Dashboard | Main dashboard view (habits + tasks + day calendar strip) |
| Calendar | Full calendar view with Day / Week / Month tabs |
| Quests | Quest management view |

Remove any other top-level nav items (Financial Se…, Strength, Portugal shortcuts, etc.).

### 6. Dashboard calendar — Day view only

- On the dashboard, the calendar panel shows **only the Day view** (today's schedule).
- Remove the Day / Week / Month tab switcher from the dashboard panel.
- The full calendar with all three views lives exclusively in the **Calendar** top-level view (existing `006_calendar-suite.md` work).

## Done When

- [ ] All dashboard sections use the same header component/style (label + `+` button)
- [ ] Tasks section header reads "Tasks" with no user-switcher tabs
- [ ] Inline "Add a task…" input is gone; `+` button in header opens task creation
- [ ] Focus Mode is fully removed from all surfaces and no entry point remains
- [ ] Pinned quests are removed from the navbar
- [ ] Navbar has exactly three items: Dashboard, Calendar, Quests
- [ ] Dashboard calendar panel shows only the Day view with no tab switcher
- [ ] Full Day/Week/Month calendar is accessible via the Calendar nav item
- [ ] `npm run build && npm run lint` pass with no errors or warnings

**Open questions**
- None — all decisions are captured above.

**Implementation notes**
_Filled in during/after implementation._
