# Feature: Momentum & Energy

> **File:** `012_momentum_and_energy.md`
> **Status:** completed

## What & Why

**Problem:** Standard todo lists feel static. Users (especially those with ADHD) often lack a sense of "narrative progress" and can feel overwhelmed by a long list of tasks without knowing which ones fit their current energy level.

**Goal:** Provide a dynamic feedback loop through **Quest Momentum** (rewarding consistency and progress) and **Task Energy** (allowing users to match tasks to their current mental capacity).

**Not in scope (this release):**
- Complex XP, levels, or point-based gamification.
- Automatic energy detection from device sensors (e.g. step count, sleep).
- Shared quest momentum (initially personal only).

---

## How It Works

This feature is implemented in two distinct phases.

### Phase 1: Task Energy Level
Each task has a subjective energy attribute assigned by the user.

- **Simple Categories:**
    - **Low** (5 min call, quick admin, "I'm tired")
    - **Medium** (Standard task, focus required)
    - **High** (Deep focus, high effort, "I'm fresh")
- **Default:** All new tasks are set to **Low** by default to minimize creation friction.
- **UI:** A subtle indicator next to the task card in the list. 
- **Filtering:** Users can filter the task list by energy level. If they feel low energy, they can quickly see only the "Low" tasks.

### Phase 2: User Momentum, Quest Momentum and Task Momentum Contribution
Momentum is a narrative feedback attribute for each user and each quest. It is NOT a score, but a representation of "how active" a quest is.
User momentum is contributed to by completing tasks.
Quest momentum is contributed to by completing tasks linked to the quest.

Each task will have a new attribute 'momentum_contribution' that represents how much momentum the task contributes to its quest.
Completing a task increases the user's and quest's momentum by the value of the task's 'momentum_contribution' attribute.

When a task is created or its energy level is changed, AI will be used to update the task's 'momentum_contribution' attribute.
The AI will use the task's energy level to determine the contribution value.
Low energy tasks will contribute 10 points + 1-5 points determined by the AI based on the context.
Medium energy tasks will contribute 20 points + 5-10 points determined by the AI based on the context.
High energy tasks will contribute 30 points + 10-20 points determined by the AI based on the context.

There is an existing call to AI on task creation or update. We need to extend that one instead of adding a new one. See 011_AI-generated-nudges.md

- **Momentum Decay:** If a user's or quest's momentum doesn't increase for **24 hours**, it starts to slowly decrease (1% per day).
- **User Reminders:** Before a quest starts losing momentum (e.g. after 12 hours of inactivity), the user receives a "Nudge" (see Spec 011) suggesting a quick "Low Energy" task to keep it alive.
- **Visuals:** to be done later.

### 3. Future Expansion - Out of Scope for now
- **Energy Matching:** The system tracks the user's perceived energy level (e.g. via a quick "How are you feeling?" check-in or by observing completed tasks) and suggests tasks that match.
- **Energy Grooming Sessions:** A 60-second "refinement" session that guides the user through a stack of tasks that don't have an energy level allocated yet, ensuring the "doable now" filters stay useful.

---

## Done When

### Phase 1: Task Energy Level
- [x] `energy_level` field (enum: low, medium, high) added to `todos` table in Supabase.
- [x] TypeScript types updated to include `energy_level`.
- [x] UI added to `TodoDetailPanel` to select an energy level.
- [x] Task card shows a subtle indicator of the energy level.
- [x] Task list filtering by energy level is functional ("Doable Now" filter).

### Phase 2: Quest Momentum
- [x] `momentum` attribute (integer) added to `quests` table.
- [x] Completing a task increases the linked quest's momentum according to the energy scale.
- [x] Momentum decay logic implemented (cron job or background check every 24h).
- [x] Nudge/notification sent before momentum decay begins.

**Open questions**
- Should momentum have a "Max" cap (e.g. 100)?
- Does pausing a quest stop momentum decay? (Probably yes).
- How visible should the "Momentum Decay" be? (Subtle, to avoid "red overdue" stress).

**Implementation notes**
- Use a Supabase Edge Function or a simple periodic server task to handle momentum decay and reminders.
- Energy icons should be subtle enough to not distract from the task title.
- Momentum increase should be animated (see Spec 013).

