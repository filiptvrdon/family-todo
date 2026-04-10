# Feature: Habit Tracking

> **File:** `023_habits.md`
> **Status:** done

## What & Why

Todos are for discrete actions that complete and disappear. Habits are for *recurring practices* that you want to build or sustain — things you never "finish", you only keep up with. The same ADHD-friendly app that helps two people reduce friction with tasks should also support the behavioral scaffolding that makes daily life more stable: taking medication, exercising, drinking water, working on a creative project.

**Goal:** Give users a lightweight, non-guilt-inducing way to define habits and log occurrences per day or per week, with a visual sense of progress toward a goal. The tracking interaction must be fast (< 5 seconds) and work on mobile without a keyboard.

**Not covered by this spec:**
- Streaks (planned separately; this spec establishes the foundation)
- AI-generated habit suggestions
- Habit reminders / push notifications
- Partner habits visibility (read-only partner column is a follow-up)
- Archiving or deleting habits (follow-up)

---

## Value Types

Habits vary significantly in *what* gets tracked. The spec defines four value types:

### 1. Count (`count`)
The user tracks a number — how many reps, how many glasses, how many pages. Each "session" is a single integer.

- **Goal:** a daily or weekly count target (e.g., "8 glasses of water per day")
- **Logging:** `+` / `−` buttons increment/decrement toward the goal. The tally shows `current / goal`.
- **Variable set use-case:** For activities with natural "sets" (pull-ups, push-ups), the user taps `+` once per set — each tap logs that set's count via a small input. Under the hood these are stored as separate `habit_tracking` records for that day. The card shows the *sum* and how it compares to the goal.

### 2. Time (`time`)
The user tracks *duration* in minutes (stored as integer minutes).

- **Goal:** a daily or weekly minute target (e.g., "45 min reading per day")
- **Logging:** Quick-select buttons (5 min, 10 min, 15 min, 30 min, 45 min, 60 min) + a "Custom" option that opens a numeric stepper. Each tap *adds* to the day's total.
- **Display:** `current / goal` shown as minutes. If ≥ 60 minutes accumulated, display as `1h 15m` etc.

### 3. Boolean (`boolean`)
The simplest case: did the user do this today or not?

- **Goal:** a target of X days per week (e.g., "cold shower 5× per week")
- **Logging:** Single tap to mark done. A second tap un-marks it.
- **Display:** Checkmark when done; empty ring when not. Weekly progress shows `X/Y days`.

### 4. Freeform (`freeform`)
For habits where the user wants to log a custom number each session without a fixed unit (e.g., "write X words", "run X km"). Each session is a separate entry with its own value.

- **Goal:** an optional daily/weekly total target
- **Logging:** Tap `+` → numeric input appears inline → confirm. Each entry is stored separately. Card shows sum of today's entries vs. goal.
- **Why separate from `count`?** Count habits use `+`/`−` to increment a single accumulating integer. Freeform habits always prompt the user to enter a specific number, making it natural for variable-value sessions like running distances or word counts.

---

## Data Model

### `habits` table (blueprint)

```sql
id              uuid          PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE
title           text          NOT NULL
description     text
icon            text                       -- emoji or icon name, e.g. "💧"
value_type      text          NOT NULL     -- 'count' | 'time' | 'boolean' | 'freeform'
unit_label      text                       -- display label: "reps", "min", "glasses", "km", "words"
                                           -- null for boolean
goal_value      integer                    -- target total per period; null = no goal
                                           -- for boolean: target days per week
goal_period     text          NOT NULL     -- 'daily' | 'weekly'
                                           -- daily = resets at midnight; weekly = resets Monday
index           text          NOT NULL DEFAULT ''  -- fractional index for ordering (same as todos)
is_archived     boolean       NOT NULL DEFAULT false
created_at      timestamptz   NOT NULL DEFAULT now()
```

**Notes:**
- `value_type` drives the UI and logging interaction.
- `unit_label` is purely presentational (e.g., "glasses", "reps", "km", "pages"). It is `null` for boolean habits.
- `goal_value` is `null` when the user just wants to log without a target.
- `goal_period` determines the reset window. `daily` progress resets at midnight local time; `weekly` resets on Monday.
- `index` uses the same fractional indexing scheme as `todos` for manual reordering.

### `habit_tracking` table (log entries)

```sql
id              uuid          PRIMARY KEY DEFAULT gen_random_uuid()
habit_id        uuid          NOT NULL REFERENCES habits(id) ON DELETE CASCADE
user_id         uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE
value           integer       NOT NULL     -- minutes for 'time'; reps/units for 'count'/'freeform';
                                           -- 1 or 0 for 'boolean'
logged_at       timestamptz   NOT NULL DEFAULT now()
period_date     date          NOT NULL     -- canonical date for this entry (YYYY-MM-DD, user's local date)
                                           -- used for grouping; avoids timezone aggregation issues
note            text                       -- optional brief note per session
```

**Key design decisions:**
- Every log is a separate row — even increments via `+`. This enables "undo last", per-session notes, and eventual analytics without schema changes.
- `period_date` is stored separately from `logged_at` to make aggregations reliable regardless of timezone. The client always sends the local date.
- `value` is always an integer. Time is stored as minutes. For boolean done/not-done, `value = 1` (done).
- The progress shown in the UI is `SUM(value) WHERE period_date = today AND habit_id = X` for daily habits. For weekly, it sums from the current week's Monday.
- Deleting the last `habit_tracking` entry for a day via `−` button removes that row (not soft-delete).

### RLS policies

```sql
-- habits: user manages own, partner can read
SELECT: user_id = auth.uid() OR user_id = (SELECT partner_id FROM users WHERE id = auth.uid())
INSERT / UPDATE / DELETE: user_id = auth.uid()

-- habit_tracking: same pattern
SELECT: user_id = auth.uid() OR user_id = (SELECT partner_id FROM users WHERE id = auth.uid())
INSERT / UPDATE / DELETE: user_id = auth.uid()
```

---

## UI / UX

### Dashboard layout change

The `ResponsiveDashboard` currently renders a **2-column layout** on desktop (TaskBoard left, detail right). With habits, the layout becomes **3-column** on wide screens:

| Column | Width  | Content                            |
|--------|--------|------------------------------------|
| Left   | ~30%   | Habits section (`HabitList`)       |
| Center | ~40%   | TaskBoard (user + partner todos)   |
| Right  | ~30%   | Schedule / Focus Mode              |

- **Mobile:** Habits are a new tab in the tab bar (icon: `✦` or a loop icon). Order: `tasks | habits | schedule | focus`.
- **Breakpoint:** 3-column layout activates at `lg` (1024px). Between `md` and `lg`, use the existing 2-column layout with habits collapsed into the tab bar.

### `HabitList` component

A vertical list of `HabitCard` components, with a header row "Habits" and an `+` button to add a new habit.

- Habits are ordered by `index` (user-draggable to reorder — same dnd-kit pattern as todos).
- No filtering UI initially (habits list is expected to be short, < 10).
- Empty state: warm illustration + "Add your first habit" CTA.

### `HabitCard` component

Each card shows:

```
[icon] Title                        [value_type indicator]
       progress bar (if goal set)
       [−] [current / goal unit] [+]     ← for count/time/freeform
       [○ Mark done]                     ← for boolean, or [✓ Done] when complete
       [M T W T F S S]                  ← for boolean weekly habits; greyed = not done, filled = done
       [today's sessions list]           ← collapsed by default; tap to expand (count/time/freeform only)
```

**States:**
- **At goal / complete:** Card background shifts to a soft celebratory tint (warm green from the design system). No confetti — subtle is better for ADHD.
- **Partial progress:** Progress bar fills proportionally; neutral color.
- **No goal set:** No progress bar; just shows the accumulated count for the period.
- **Disabled `−`:** When current total = 0, the `−` button is visibly disabled (not hidden).

**`+` interaction details by type:**

| Type      | Tap `+` does                                                   |
|-----------|----------------------------------------------------------------|
| `count`   | Adds 1 to total. Long-press `+` → small inline popover to enter a custom number for this set. |
| `time`    | Reveals a row of time chips inline on the card: **5 / 10 / 15 / 30 / 45 / 60 min** + "other" (opens a numeric stepper). Tapping a chip logs immediately. |
| `boolean` | Not applicable — uses "Mark done" tap instead.                  |
| `freeform`| Tapping `+` opens an inline number input with "Log" confirm button. |

**`−` interaction:**
- Removes the **most recent** `habit_tracking` entry for today. This is effectively "undo last".
- For `boolean`: un-marks the done state (removes the entry for today).
- Disabled (grayed) when current total = 0.

**Sessions list (expandable):**
- A small expand toggle at the bottom of the card reveals a list of today's individual entries: `10:34 — 10 reps`, `11:20 — 9 reps`, etc.
- Each entry has a delete icon for surgical correction.
- This handles the pull-ups sets use-case: user can see each set they logged.

### `HabitForm` (create / edit)

A bottom-sheet (`.detail-panel-popup`) with fields:

1. **Title** — text input (required)
2. **Icon** — emoji picker (small grid of suggestions + free input)
3. **Type** — pill selector: Count | Time | Boolean | Freeform
4. **Unit** *(count / freeform only)* — short text input ("reps", "glasses", "km") — shown/hidden based on type selection
5. **Goal** *(optional)* — numeric input + period selector (Daily / Weekly)
   - For boolean: goal is "X days per week" (integer 1–7, shown as a slider or quick-select)
   - For time: goal is entered in minutes; displayed as "45 min per day"
6. **Save** button — disabled until title is filled

No reminders in this version.

### Tone

- Empty state: *"Nothing tracked yet today — tap + to get started."*
- At goal: *"Done for today ✓"*
- Not yet started: the goal is visible but no pressure language.
- Habit card header uses the same warm, lowercase tone as the rest of the app.

---

## Done When

- [ ] `habits` and `habit_tracking` tables created via migration with correct RLS
- [ ] `HabitCard` renders correctly for all four value types
- [ ] `+` logging works for all types (count increment, time picker, boolean toggle, freeform input)
- [ ] `−` removes the most recent entry; disabled at zero
- [ ] Sessions list (expandable) shows per-entry detail for count/time/freeform
- [ ] Progress bar and `current/goal` display correct for daily and weekly periods
- [ ] At-goal state shows celebratory card tint
- [ ] `HabitForm` bottom-sheet creates and edits habits
- [ ] Habit list is sortable via drag (same dnd-kit pattern as todos)
- [ ] ResponsiveDashboard shows 3-column layout at `lg`, habits tab on mobile
- [ ] Zustand store + service layer pattern followed (no direct Supabase in components)
- [ ] Realtime subscription keeps habit cards live without refresh
- [ ] All build and lint checks pass
- [ ] Mobile-first: all touch targets ≥ 44px, works on 390px viewport

**Open questions**

~~1. **Mobile tab order:** Resolved — habits is tab 2 (after tasks).~~
~~2. **Weekly progress for boolean habits:** Resolved — show day-of-week letters `M T W T F S S`; greyed = 0, filled = 1.~~
~~3. **Goal optional or required?** Resolved — optional, but the form nudges you to set one.~~
~~4. **Long-press `+` for custom set size:** Resolved — use long-press.~~
~~5. **Time input inline vs popover:** Resolved — time chips appear inline on the card.~~
~~6. **Partner visibility:** Deferred to a follow-up spec.~~

**Implementation notes**

_To be filled during implementation._
