# Feature: "Now" Suggestions Layer

> **File:** `014_now-layer.md`
> **Status:** draft

## What & Why

**Problem:** Users often feel overwhelmed by a long list of tasks and don't know what to start with.
**Goal:** Provide a "Now" layer at the top of the task list that suggests 1–3 specific actions based on current context, energy, and priority.
**Not covered:** Full AI-based scheduling or complex calendar optimization.

## How It Works

### The Suggestions UI
Above the main task list, a "⚡ Good time for:" section is shown. It contains 1–3 task suggestions that can be completed quickly or are high priority.

Examples:
- [ ] Call agent (5 min) — *Low effort*
- [ ] Send email — *High priority*
- [ ] Update quest progress — *Recently active*

### Selection Algorithm (The "Now" Engine)
The system picks tasks to show in the "Now" layer based on:
1. **Due today / soon:** Tasks that are approaching their deadline.
2. **Low effort:** If the user has many tasks, suggest those tagged with "Low Energy" to build momentum.
3. **Recently active quest:** Tasks linked to quests the user has worked on in the last 24–48 hours.
4. **"Resume Flow":** If the user recently closed the app while viewing a specific quest or task, suggest the next step in that quest.

### "Resume Flow" Behavior
When reopening the app after a short break, the "Now" layer explicitly highlights where the user left off:
> **Last time you were working on:**
> 🏝 Portugal Move
> [ ] Call agent

## Done When

- [ ] "Now" layer UI component implemented at the top of `TodoList`.
- [ ] Suggestion logic implemented (Due soon > Low energy if overwhelmed > Recent quest).
- [ ] "Resume Flow" persists the last viewed quest/task and displays it upon re-entry.
- [ ] Suggestions are actionable (can be completed directly from the "Now" layer).

**Open questions**
- Should we use location/time of day to further refine suggestions (e.g. "Work" contexts during 9-5)?
- How often should the suggestions refresh?

**Implementation notes**
- Use `localStorage` or a simple `last_viewed_context` field in the user profile to track "Resume Flow".
