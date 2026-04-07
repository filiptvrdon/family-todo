# Feature: Quests

> **File:** `010_quests.md`
> **Status:** done

## What & Why

Individual tasks feel disconnected and low-meaning. For users who think in terms of goals and momentum (especially ADHD brains), a standalone task list provides no motivational narrative — completing a task feels like crossing something off, not like moving toward something.

**Goal:** Users can define Quests (meaningful goals), link tasks to them, and receive warm feedback when completing a task that confirms progress toward the quest.

**Tasks stay primary.** Quests are the narrative context that gives tasks meaning — not a separate productivity layer.

**Not in scope (this release):**
- No XP, points, levels, or percentages — narrative only, never gamification.
- No auto-suggestion of which tasks belong to a quest.
- No sub-quests or quest hierarchies.
- No shared/partner quests (LATER).
- No AI-generated nudge text (LATER — use pre-written templates for now).

## How It Works

### Creating a quest

1. User taps "New Quest" via the `Swords` icon in the navbar.
   - **LATER:** one-tap quick creation — a single input field in the navbar dropdown that creates a quest with just a name (icon defaults, description skipped). Same fast-path philosophy as task creation.
2. Fills in: **name** (required), **emoji icon** (required, selected from a 30-emoji grid, stored as emoji string e.g. `"⚔️"`), **description** (optional).
3. Quest is created with `status = active` and appears in the quests list.
4. From the quests list, the user can **pin up to 3 quests to the navbar**. The navbar shows the icon + name of each pinned quest.

### Editing a quest

- Pencil button in the quest detail header enters edit mode.
- Edit mode shows the icon picker, name input, and description textarea. Header previews changes live.
- Linked tasks show an unlink (X) button in edit mode — removes immediately from `quest_tasks`.
- Save / Cancel buttons commit or discard changes.

### Linking a task to a quest

- In the task detail panel, a quest picker (pill buttons) lists all active quests. Completed quests not shown.
- A task can be linked to **multiple quests** (many-to-many via `quest_tasks`).
- Quest links are synced on task save (delete all + re-insert selected).
- Task cards show the linked quest icon(s) in primary blue (up to 3, with quest name as tooltip).

### Completing a quest-linked task

1. User completes a task linked to one or more quests.
2. A warm, transient toast nudge appears naming all linked quests:
   - e.g. *"That moves you closer to Beach house and Fix the flat."*
3. Non-blocking, auto-dismissed. No modal.

### Viewing a quest

- Quest detail shows: icon, name, description, prose progress, linked tasks (open and completed with checkmark).
- Progress framed as prose: *"You've taken 3 steps toward this."* — never a percentage or count.

### Closing a quest

- Quest completion is **always manual** — user taps "Mark quest as complete" in the detail view.
- Completed quests are filtered out of the active list and archived (status = `completed`), never deleted.

---

### Data model

**New table: `quests`**

| column | type | notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles.id` |
| `name` | `text` | required |
| `icon` | `text` | Emoji character, e.g. `"⚔️"` — rendered via `QuestIcon` in `src/lib/questIcons.tsx` |
| `description` | `text` | nullable |
| `status` | `text` | `active` \| `completed`, default `active` |
| `pinned` | `boolean` | default `false` — user pins up to 3 to navbar |
| `completed_at` | `timestamptz` | nullable |
| `created_at` | `timestamptz` | default `now()` |

**New join table: `quest_tasks`** (many-to-many)

| column | type | notes |
|---|---|---|
| `quest_id` | `uuid` | FK → `quests.id` |
| `task_id` | `uuid` | FK → `todos.id` |
| PRIMARY KEY | | `(quest_id, task_id)` |

No changes to the `todos` table.

Migration: `supabase migration new add_quests`

---

### Server actions

- `createQuest(name, icon, description?)` — insert into `quests`
- `updateQuest(id, fields)` — update name, icon, description, pinned
- `completeQuest(id)` — set `status = completed`, `completed_at = now()`
- `getPinnedQuests()` — returns up to 3 pinned quests for navbar
- `getQuestsForUser()` — returns all quests (active first) with linked task count
- `getQuestDetail(id)` — returns quest + all linked tasks
- `linkTaskToQuest(taskId, questId)` / `unlinkTaskFromQuest(taskId, questId)` — insert/delete from `quest_tasks`
- `getQuestsForTask(taskId)` — returns all quests linked to a task (used to build completion nudge)

---

### Client / state

- On task completion: fetch `getQuestsForTask(taskId)`. If any quests are returned, show nudge.
- Nudge is local component state — no persistence, auto-dismissed after ~3s.
- Pinned quests in navbar: fetched once on mount, cached in context.
- Enforce max 3 pinned in UI (disable pin toggle when 3 are already pinned).

## Done When

- [x] User can create a quest with name, emoji icon, and optional description.
- [x] User can pin up to 3 quests to the navbar; navbar shows icon + name.
- [x] User can edit quest name, icon, description from the detail view.
- [x] When editing a task, user can link it to one or more quests via a picker.
- [x] Tasks with quest links display the quest icon(s) in the task card.
- [x] Completing a quest-linked task shows a warm, transient nudge naming all linked quests.
- [x] Nudge is non-blocking and auto-dismissed; no modal.
- [x] Quest detail view shows linked tasks and progress in prose (no percentages).
- [x] User can unlink tasks from the quest detail edit mode.
- [x] User can manually mark a quest as complete.
- [x] Completed quests are archived, not deleted.
- [x] Max 3 quests can be pinned; UI prevents pinning a 4th.
- [x] Subtasks automatically inherit the quest assignments of their parent task.

**Open questions**
- None.

**Implementation notes**
- Icons use regular emojis, stored as text in `QUEST_ICONS` array and rendered via `QuestIcon` component in `src/lib/questIcons.tsx`.
- Quest link icons on task cards are batch-fetched in `TodoList` (one query for all visible todo IDs) — not per-card. Map invalidates when task detail is saved.
- Quest link sync on task save: delete-all + re-insert pattern (simple, no diffing needed at this scale).
- Subtasks inherit parent's quests: implemented in `TodoStore` (`addTodo` and `updateTodo`) by fetching parent's quest links and applying them to the child.
- Pinned quests are re-fetched client-side in `Dashboard.refreshPinnedQuests()` after any quest change; initial value comes from SSR in `page.tsx`.
