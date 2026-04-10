# Feature: Completion History & Weekly Reflection

> **File:** `018_completion-history-and-reflection.md`
> **Status:** draft

## What & Why

**Problem:** Completed tasks usually just disappear, which can lead to a feeling of no progress and reduce satisfaction. Users also lack a high-level view of where their time and energy are going.
**Goal:** Make progress visible with a lightweight daily completion history and a weekly reflection that summarizes quest activity.
**Not covered:** Full analytics dashboard or detailed time tracking.

## How It Works

### Daily Completion History
At the bottom of the task list (or in a dedicated section), show a summary of completed tasks for the current day.
- **Summary:** `✔ Completed today (3)`
- **Behavior:** The list is collapsed by default to avoid clutter but is easily expandable.
- **Satisfaction:** Seeing the list grows throughout the day reinforces the user's momentum.

### Weekly Reflection
Once a week (e.g. Sunday evening or Monday morning), the app presents a simple summary of quest progress.
- **Quest Status:**
    - 🏝 Portugal Move → **strong progress** (many tasks completed)
    - 💪 Strength → **consistent** (regular activity)
    - 💼 Career → **low activity** (few tasks completed)
- **Purpose:** Creates awareness and helps the user decide where to focus in the coming week.

## Done When

- [ ] "Completed today" section added to the bottom of `TodoList`.
- [ ] Section is expandable/collapsible and correctly counts today's completions.
- [ ] Weekly reflection view implemented.
- [ ] Reflection logic correctly calculates quest activity (based on tasks completed per quest in the last 7 days).
- [ ] Notifications/Nudges for weekly reflection implemented.

**Open questions**
- Should the weekly reflection be automated or require user input (e.g. a short check-in)?
- How long should the daily history persist (just for the current day or also yesterday)?

**Implementation notes**
- Use the `completed_at` timestamp on `todos` to filter for the daily history and weekly stats.
- Weekly stats can be derived by counting task completions per `quest_id` over the last 7 days.
