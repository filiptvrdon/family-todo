# Feature: Task Contexts

> **File:** `017_task-contexts.md`
> **Status:** draft

## What & Why

**Problem:** Users switch between different mental and physical environments (e.g. at home, at work, on the phone), and seeing tasks that can't be done in the current context increases cognitive load.
**Goal:** Introduce contexts to help users batch tasks and focus on what is possible right now.
**Not covered:** Full location-based automation or complex project categories.

## How It Works

### Defining Contexts
Contexts are lightweight tags that represent "where" or "how" a task is done.
- **Home:** 🏠 Household chores, family admin.
- **Work:** 💻 Professional tasks, deep focus.
- **Phone:** 📱 Calls, quick texts, mobile-friendly actions.

### Task Assignment
- Users can assign a single context to a task (binary context).
- Smart Task Input (Spec 015) can auto-assign contexts based on keywords (e.g. "call" -> Phone).

### UI: Grouping and Filtering
- The main task list can be grouped by context (e.g. show all "Phone" tasks together).
- Alternatively, users can apply a context filter to hide tasks that don't match the current situation (e.g. hide "Work" tasks when at home).

## Done When

- [ ] `context` field added to the `todos` model.
- [ ] UI for selecting a context added to `TodoDetailPanel`.
- [ ] Context grouping option implemented in `TodoList`.
- [ ] Context filter added to the main view.
- [ ] Basic keyword-to-context auto-assignment for common terms (e.g. "call").

**Open questions**
- Should users be able to define custom contexts?
- Should the "Now" suggestion engine (Spec 014) prioritize tasks based on the active context?

**Implementation notes**
- Keep the number of contexts small (3–5 max) to avoid over-categorization.
- Store context as a simple enum or string field in the `todos` table.
