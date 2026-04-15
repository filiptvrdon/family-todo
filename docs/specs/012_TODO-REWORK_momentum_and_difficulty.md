# Feature: Momentum & Difficulty

> **File:** `012_momentum_and_difficulty.md`
> **Status:** completed

## What & Why

**Problem:** Standard todo lists feel static. Users (especially those with ADHD) often lack a sense of "narrative progress" and can feel overwhelmed by a long list of tasks without knowing which ones fit their current mental capacity.

**Goal:** Provide a dynamic feedback loop through **Quest Momentum** (rewarding consistency and progress) and **Task Difficulty** (allowing users to match tasks to their current mental capacity).

**Not in scope (this release):**
- Complex XP, levels, or point-based gamification.
- Automatic difficulty detection from device sensors (e.g. step count, sleep).
- Shared quest momentum (initially personal only).

---

## How It Works

This feature is implemented in two distinct phases.

### Phase 1: Task Difficulty Level
Each task has a subjective difficulty attribute assigned by the user.

- **Simple Categories:**
    - **gentle** (mapped to `low` in DB)
    - **moderate** (mapped to `medium` in DB)
    - **involved** (mapped to `high` in DB)
- **Default:** All new tasks are set to **gentle** (`low`) by default to minimize creation friction.
- **UI:** A subtle indicator next to the task card in the list. 
- **Filtering:** (Removed) Users previously could filter the task list by difficulty level. This was removed to simplify the task view.

### Phase 2: User Momentum (Legacy / Deprecated)
Initially, momentum was planned as a narrative feedback attribute using point-based decay. This has been superseded by the **Daily Achievement Summary** described below. 

- **Legacy Attributes:** `momentum_contribution`, `momentum`, `momentum_decay`.
- **Superseded by:** Daily task counts and difficulty-based summaries.
- **Visuals:** Replaced abstract scores with `DifficultyIndicator` dots and labels.

See the **Daily Achievement Summary** section for the current implementation.

### 3. Future Expansion - Out of Scope for now
- **Difficulty Matching:** The system tracks the user's perceived capacity (e.g. via a quick "How are you feeling?" check-in or by observing completed tasks) and suggests tasks that match.
- **Difficulty Grooming Sessions:** A 60-second "refinement" session that guides the user through a stack of tasks that don't have a difficulty level allocated yet, ensuring the "doable now" filters stay useful.

---

## Done When

### Phase 1: Task Difficulty Level
- [x] `energy_level` field (enum: low, medium, high) added to `todos` table in Supabase.
- [x] TypeScript types updated to include `energy_level`.
- [x] UI added to `TodoDetailPanel` to select a difficulty level (gentle, moderate, involved).
- [x] Task card shows a subtle vertical indicator (label above dots) of the difficulty level.
- [x] Task list filtering by difficulty level was implemented and then removed to simplify the view.

### Phase 2: Daily Achievement Summary (Successor to Quest Momentum)
- [x] Replaced the point-based momentum system with a tangible achievement summary.
- [x] Achievement summary displays daily totals by difficulty level (e.g., `● 2 | ●● 4 | ●●● 1`).
- [x] Encouraging empty state: "Ready for your first win?".
- [x] Legacy momentum logic and columns deprecated and slated for removal.

**Open questions**
- Should achievement summaries show a weekly trend or streak?
- How to handle difficulty levels for shared tasks (e.g., if a task is 'involved' for one partner but 'gentle' for the other)?

**Implementation notes**
- Difficulty icons should be subtle enough to not distract from the task title.
- Achievement summaries are updated in real-time as tasks are completed/uncompleted.
- The UI uses the `energy_level` field from the database for all calculations.

---

## Daily Achievement Summary

**Problem:** The previous momentum system used an abstract point value and a decay mechanism. This "hidden" calculation made it difficult for users to see their actual productivity and could create negative pressure ("I'm losing points").

**Goal:** Replace the points-based decay system with a **Daily Achievement Summary** that focuses on task counts and difficulty levels.

### How it Works

1. **Daily Totals by Difficulty Level:**
   - Instead of a single momentum score, the user's progress for a given day is a summary of completed tasks grouped by difficulty.
   - Display: Vertical indicators with labels and dots (e.g., `gentle ● | moderate ●● | involved ●●●`).
   - Encouraging message when no tasks are completed: "Ready for your first win?".

2. **Daily Task History:**
   - Users can see their achievements reflected in the Dashboard, User Modal, and Quest Detail views.

3. **Removal of Decay:**
   - The 24-hour decay logic is deprecated.
   - Focus shifts from "maintaining a score" to "celebrating daily wins."

### Implementation Details

- **Data Source:** Uses `completed_at` and `energy_level` columns in the `todos` table.
- **Filtering Logic:**
  - Today's summary: `todos` where `completed = true` and `completed_at` is today.
- **UI Locations:**
  - **Dashboard:** Show the achievement summary for the current day.
  - **User Modal:** Display the user's progress.
  - **Quest Details:** Show quest-specific daily achievement summaries.
- **Database Deprecation:**
  - The `momentum`, `day_start_momentum`, and `last_momentum_increase` columns in `users` and `quests` tables are deprecated.
  - The `process_daily_momentum` function and associated triggers are no longer used.

### Visual Representation of Difficulty Levels

To make the UI clean and intuitive, the text-based labels ("gentle", "moderate", "involved") are represented by filled dots with a tiny label above them. Each level uses a color from the project's Coastal palette defined in `globals.css`.

**Difficulty Indicators:**

*   **gentle:** `low` | (label) ● (Ocean Teal: `#10BBAA`)
*   **moderate:** `medium` | (label) ●● (Sunset Coral: `#FF9F7F`)
*   **involved:** `high` | (label) ●●● (Violet: `#8B5CF6`)
*   **Layout:** Vertical stack (label above dots).
*   **Visual Style:** Small caps/lowercase bold label, circular dots in a row.

**UI Implementation:**
*   **Task List:** The indicator is displayed next to the task metadata.
*   **Detail Panel:** Selection buttons use the full pill-style indicator with labels.
*   **Summaries:** Compact version used in achievement rows.

### Database Cleanup & Deprecation

Once the new achievement-based momentum system is fully implemented and verified, the following columns and logic will be deprecated and removed to simplify the schema:

**Columns to Remove:**

*   **`public.users` table:**
    *   `momentum`: Abstract point value.
    *   `last_momentum_increase`: Timestamp for decay calculation.
    *   `day_start_momentum`: Reference point for daily progress.
*   **`public.todos` table:**
    *   `momentum_contribution`: Pre-calculated point value for tasks.
*   **`public.quests` table:**
    *   `momentum`: Abstract point value.
    *   `last_momentum_increase`: Timestamp for decay calculation.
    *   `day_start_momentum`: Reference point for daily progress.
    *   `last_momentum_nudge`: Tracking for decay-prevention nudges.

**Logic to Remove:**

*   `process_daily_momentum()` Supabase function and its scheduled execution.
*   `handle_todo_completion_momentum()` Supabase function.
*   `on_todo_completed_momentum` trigger on the `todos` table.
*   `maintainMomentum()` function in `src/lib/momentum.ts` (and its calls in the application).

