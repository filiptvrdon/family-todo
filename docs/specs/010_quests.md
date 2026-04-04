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

1. User taps "New Quest" (entry: navbar quests menu).
2. Fills in: **name** (required), **emoji icon** (required, stored as a Unicode string), **description** (optional).
3. Quest is created with `status = active` and appears in the quests list.
4. From the quests list, the user can **pin up to 3 quests to the navbar**. The navbar shows the emoji + name of each pinned quest plus a link to the full quests list.

### Linking a task to a quest

- When creating or editing a task, an optional quest picker lists all active quests only. Completed quests are not shown.
- A task can be linked to **multiple quests** (many-to-many).
- Tasks linked to any quest display the quest's emoji icon(s) as a visual indicator in the task list.

### Completing a quest-linked task

1. User completes a task linked to one or more quests.
2. A warm, transient nudge appears — one message mentioning all linked quests by name:
   - e.g. *"That moves you closer to 🏖️ Beach house and 🛠️ Fix the flat."*
   - Tone: encouraging, personal. Never generic. Always names the quest(s).
3. The nudge is non-blocking — a brief overlay or inline toast, auto-dismissed. No modal.

### Viewing a quest

- Quest detail shows: name, emoji, description, linked tasks (open and completed).
- Progress framed as prose: *"You've taken 3 steps toward this."* — never a percentage or count bar.

### Closing a quest

- Quest completion is **always manual** — user explicitly marks it as complete.
- Triggers a celebration moment (wording TBD — warm, not over-the-top).
- Completed quests move to an archive view, never deleted.

---

### Data model

**New table: `quests`**

| column | type | notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles.id` |
| `name` | `text` | required |
| `icon` | `text` | emoji string, e.g. `"🏖️"` |
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

- [ ] User can create a quest with name, emoji, and optional description.
- [ ] User can pin up to 3 quests to the navbar; navbar shows emoji + name + link to list.
- [ ] When creating/editing a task, user can link it to one or more quests via a picker.
- [ ] Tasks with quest links display the quest emoji(s) as a visual indicator.
- [ ] Completing a quest-linked task shows a warm, transient nudge naming all linked quests.
- [ ] Nudge is non-blocking and auto-dismissed; no modal.
- [ ] Quest detail view shows linked tasks and progress in prose (no percentages).
- [ ] User can manually mark a quest as complete; triggers a celebration moment.
- [ ] Completed quests are archived, not deleted.
- [ ] Max 3 quests can be pinned; UI prevents pinning a 4th.

**Open questions**
- None.

**Implementation notes**
_To be filled during implementation._
