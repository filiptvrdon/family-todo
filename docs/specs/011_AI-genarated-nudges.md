# Feature: AI-Generated Nudges

> **File:** `011_AI-genarated-nudges.md`
> **Status:** draft

## What & Why

Tasks in isolation feel arbitrary. Quests give them narrative context, but the connection is currently static (template text). ADHD users especially benefit from moment-to-moment meaning — knowing *why* this specific task matters right now is often the difference between starting and avoiding.

**Goal:** Every task and subtask has two short AI-generated messages: one that motivates before starting, one that celebrates after completing. Both are personal to the task, its parent chain, its quests, and the user.

**Not in scope:**
- Nudge regeneration (nudge is generated once; no manual refresh button).
- Nudges for partner's tasks (nudges are generated from the owner's perspective only).
- Push notifications using nudge text.

---

## How It Works

### Nudge types

| Field | When shown | Tone |
|---|---|---|
| `motivation_nudge` | Task card + task detail while task is open | Encouraging, forward-looking — "here's why this matters" |
| `completion_nudge` | Toast on completion + task detail after completion | Warm, celebratory — "here's what you just achieved" |

### Generation trigger

Nudges are generated **asynchronously in the background** immediately after a task is created or updated. The UI does not wait — nudge fields start as `null` and are filled in once the AI responds.

Triggers:
- Task created
- Task title or description updated
- Task linked to / unlinked from a quest (re-generate both nudges)
- Task's `parent_id` changes (re-generate both nudges)

**Mechanism — motivation nudge (streamed):** After the create/update server action resolves, the client opens a streaming request to `POST /api/tasks/[id]/nudges/stream`. The response is streamed token-by-token directly into the task card using `aiStream` from `@/lib/ai`. When the stream ends, the server persists the final assembled text to `todos.motivation_nudge`. On subsequent loads the card reads the stored value from DB — no re-streaming.

**Mechanism — completion nudge (async):** Triggered alongside the motivation nudge stream. Called in the background via `aiJSON`; result stored to `todos.completion_nudge` when ready. No streaming needed — by the time the user completes a task it should already be stored.

### AI context passed per request

1. The task itself (title, description, due date)
2. Parent task chain — walk `parent_id` recursively until `null`, include each ancestor
3. All quests linked to the task via `quest_tasks` (name, icon, description)
4. Owner's profile (`display_name`, `customization_prompt`) — personalises tone/language

### Prompts

**Motivation nudge** — uses `aiStream` from `@/lib/ai`:
> "Write a short, warm nudge (1–2 sentences) explaining how completing this task helps the user move forward. Reference the parent task if there is one, and the quest(s) if linked. Address the user by first name. Never use the word 'productivity'. Tone: encouraging, personal, never generic."

**Completion nudge** — uses `aiJSON` from `@/lib/ai`:
> "Write a short celebratory message (1–2 sentences) for someone who just completed this task. Highlight how it connects to the parent task (if any) and the quest(s) (if linked). Address the user by first name. Tone: warm, specific, celebratory — never hollow or generic ('Great job!')."

Both are triggered at the same time from the client. They run independently — the stream for motivation nudge, a fire-and-forget fetch for the completion nudge.

### Error handling

If the AI call or DB write fails for any reason: **silent fail** — nudge fields remain `null`, the user sees nothing. Log the error to the console (server-side `console.error`) for observability. Never surface errors to the user.

### Data model changes

**Migration:** `supabase migration new add_nudges_to_todos`

Add two nullable columns to `public.todos`:

| column | type | notes |
|---|---|---|
| `motivation_nudge` | `text` | nullable; null until AI responds |
| `completion_nudge` | `text` | nullable; null until AI responds |

No new tables needed.

### API routes

**`POST /api/tasks/[id]/nudges/stream`** — motivation nudge (streaming)

1. Authenticate; verify the user owns the task.
2. Fetch task, parent chain, linked quests, and owner profile.
3. Call `aiStream` and pipe the response back as `text/plain; charset=utf-8`.
4. After the stream ends (server-side), persist the assembled text to `todos.motivation_nudge`.
5. Returns a streaming `Response`.

**`POST /api/tasks/[id]/nudges`** — completion nudge (async, fire-and-forget)

1. Authenticate; verify the user owns the task.
2. Fetch task, parent chain, linked quests, and owner profile.
3. Call `aiJSON` for the completion nudge.
4. `UPDATE todos SET completion_nudge = ... WHERE id = ...`.
5. Returns `200 OK`. Response body is not used by the caller.

### UI — motivation nudge

- Shown on the **task card** (compact, below task title) and in the **task detail panel**.
- **First load (streaming):** text renders token-by-token as the stream arrives. No placeholder or skeleton — text simply appears and grows.
- **Subsequent loads:** reads `motivation_nudge` from the task object; renders instantly.
- While `motivation_nudge` is `null` and no stream is active: render nothing.
- Max 2 lines in card view; full text in detail panel.

### UI — completion nudge

1. User completes a task. The completion action fires immediately (non-blocking).
2. After marking complete, the client **polls the task record** (e.g. every 1 s via Supabase realtime) until `completion_nudge` is non-null.
3. Once the nudge arrives, show it as a Sonner toast — auto-dismissed after ~4 s.
4. If the nudge was already present at completion time, show the toast immediately.
5. `completion_nudge` text is also displayed in the **task detail panel** once the task is marked complete (replaces `motivation_nudge` in that slot).

---

## Done When

- [ ] `motivation_nudge` and `completion_nudge` columns added to `todos` via migration.
- [ ] `POST /api/tasks/[id]/nudges/stream` streams motivation nudge to the client and persists final text to DB on stream end.
- [ ] `POST /api/tasks/[id]/nudges` generates and stores completion nudge via `aiJSON`.
- [ ] Both routes: errors caught, logged server-side, silently ignored by the client.
- [ ] Client opens motivation stream and fires completion nudge fetch independently after task create/update.
- [ ] Nudge generation re-triggered on title/description change, quest link change, and parent change.
- [ ] Task card shows `motivation_nudge` when present; renders cleanly when `null`.
- [ ] Task detail panel shows `motivation_nudge` (open tasks) or `completion_nudge` (completed tasks) when present.
- [ ] On task completion, client waits for `completion_nudge` to arrive, then shows Sonner toast (~4 s auto-dismiss).
- [ ] Nudges are never shown for a partner's tasks from the partner's perspective (owner only).

**Open questions**
- Should nudges be re-generated on a schedule (e.g. if a task has been open for 7 days)? — defer.
- Rate-limit / cost guard: skip generation for sub-tasks beyond a certain depth? — defer.

**Implementation notes**
_Filled in during/after implementation._
