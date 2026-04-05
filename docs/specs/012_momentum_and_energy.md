# Feature: Momentum & Energy

> **File:** `012_momentum_and_energy.md`
> **Status:** draft

## What & Why

**Problem:** Standard todo lists feel static. Users (especially those with ADHD) often lack a sense of "narrative progress" and can feel overwhelmed by a long list of tasks without knowing which ones fit their current energy level.

**Goal:** Provide a dynamic feedback loop through **Quest Momentum** (rewarding consistency and progress) and **Task Energy** (allowing users to match tasks to their current mental capacity).

**Not in scope (this release):**
- Complex XP, levels, or point-based gamification.
- Automatic energy detection from device sensors (e.g. step count, sleep).
- Shared quest momentum (initially personal only).

---

## How It Works

### 1. Quest Momentum
Momentum is a narrative feedback attribute for each quest. It is NOT a score, but a representation of "how active" a quest is.

- **Momentum Increase:** Completing a task linked to a quest increases its momentum.
- **Momentum Scale:** The increase depends on the **Energy Level** of the completed task.
    - ⚪ **Low Energy task:** +1 Momentum
    - 🟡 **Medium Energy task:** +3 Momentum
    - 🔴 **High Energy task:** +6 Momentum
- **Momentum Decay:** If a quest's momentum doesn't increase for **48 hours**, it starts to slowly decrease (e.g. -1 per day).
- **User Reminders:** Before a quest starts losing momentum (e.g. after 36 hours of inactivity), the user receives a "Nudge" (see Spec 011) suggesting a quick "Low Energy" task to keep it alive.
- **Visuals:** A subtle progress bar or spark icon on the Quest card (see Spec 013 for animations).

### 2. Task Energy Level
Each task has a subjective energy attribute assigned by the user.

- **Simple Categories:**
    - ⚪ **Low** (5 min call, quick admin, "I'm tired")
    - 🟡 **Medium** (Standard task, focus required)
    - 🔴 **High** (Deep focus, high effort, "I'm fresh")
- **Default:** All new tasks are set to **⚪ Low** by default to minimize creation friction.
- **UI:** A tiny dot or icon (⚪🟡🔴) next to the task card in the list. Visible only in filters or in the detail panel to keep the main list clean.
- **"Doable Now" Filtering:** Users can filter the task list by energy level. If they feel low energy, they can quickly see only the "⚪ Low" tasks.

### 3. Future Expansion
- **Energy Matching:** The system tracks the user's perceived energy level (e.g. via a quick "How are you feeling?" check-in or by observing completed tasks) and suggests tasks that match.
- **Energy Grooming Sessions:** A 60-second "refinement" session that guides the user through a stack of tasks that don't have an energy level allocated yet, ensuring the "doable now" filters stay useful.

---

## Done When

- [ ] `momentum` attribute (integer) added to `quests` table.
- [ ] `energy_level` field (enum: low, medium, high) added to `todos` table.
- [ ] Completing a task increases the linked quest's momentum according to the energy scale.
- [ ] Momentum decay logic implemented (cron job or background check every 24h).
- [ ] UI indicators (⚪🟡🔴) added to task cards and detail panels.
- [ ] Task list filtering by energy level is functional.
- [ ] Nudge/notification sent before momentum decay begins.

**Open questions**
- Should momentum have a "Max" cap (e.g. 100)?
- Does pausing a quest stop momentum decay? (Probably yes).
- How visible should the "Momentum Decay" be? (Subtle, to avoid "red overdue" stress).

**Implementation notes**
- Use a Supabase Edge Function or a simple periodic server task to handle momentum decay and reminders.
- Energy icons should be subtle enough to not distract from the task title.
- Momentum increase should be animated (see Spec 013).

