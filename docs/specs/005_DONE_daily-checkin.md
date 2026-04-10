# Feature: Daily Check-In

> **Status:** done
> **Roadmap ref:** AI companion / daily check-in

## Problem

Starting the day with a long task list is overwhelming. Users need a gentle, conversational on-ramp that helps them surface what matters, capture anything new, and commit to a plan — without staring at a wall of items.

## Goal

Each day, a warm AI-powered check-in helps users review what's on their plate, capture new tasks through conversation, and schedule their day — then close the loop at the end.

## Non-goals

- Evening recap (separate future feature)
- Check-in available multiple times per day (once per device per day by design)
- Voice input
- Multi-user shared check-in (each partner has their own)

## Design

### User-facing behavior

**Opening:**
- Check-in modal auto-opens once per device per day (tracked in `localStorage`).
- Can also be triggered manually.
- On open: AI streams a warm personalized greeting that references overdue and due-today tasks.

**Chat section:**
- User types freely — thoughts, plans, random tasks from their head.
- AI responds conversationally, asks follow-up questions if helpful.
- On the user's first message, a background job extracts any tasks mentioned and inserts them into the DB silently (no UI interruption).

**Checklist section:**
- Shows overdue and due-today tasks as checkable items.
- User can drag items into the **Day Timeline** to schedule them.
- Checking an item marks it complete (optimistic).

**Day Timeline:**
- Hour-by-hour view (5 AM – 8 PM) within the modal.
- Drag tasks from the checklist to time slots.
- Dragging assigns `scheduled_time` on the todo.

**Wrap-up:**
- User clicks "Wrap up" button.
- AI analyzes overdue tasks. For each, it asks (implicitly via context) whether it was handled.
- Tasks explicitly acknowledged as done in the conversation are deleted.
- Modal closes with a celebration emoji.

### UI / UX notes

- Full-screen modal on mobile; centered large modal on desktop.
- Chat messages: user messages right-aligned, AI messages left-aligned with companion avatar.
- Streaming AI responses: text appears word-by-word.
- Auto-scrolls to latest message.
- Input auto-focused on open.
- See `docs/design-adhd-principles.md` — low activation energy, conversational, no forms.

### Data model

Reads:
- `todos` where `due_date <= today` or `due_date = today` for checklist
- `profiles.customization_prompt` for AI personalization

Writes:
- `todos` — inserts from background task extraction
- `todos.scheduled_time` — updated on timeline drag
- `todos.completed` — updated on checklist check
- `todos` — deleted on wrap-up for acknowledged-done tasks

### API / Server actions

`POST /api/checkin` — handles three actions:

| Action | Input | Output |
|---|---|---|
| `greet` | `{ todos, profile }` | Streaming greeting text |
| `chat` | `{ messages, todos, profile }` | Streaming reply; background task extraction inserts to DB |
| `finalize` | `{ messages, todos, profile }` | JSON `{ deletedIds: string[] }` |

AI calls go to local Ollama (`http://localhost:11434/api/chat`) with the `qwen3.5` model.

### State & client logic

- `useState(messages)` — full chat history `[{ role, content }]`
- `useState(input)` — controlled textarea
- `useState(waiting | responding | wrappingUp)` — loading states for UI feedback
- `useState(localTodos)` — optimistic todo state within the modal
- `useRef(inputRef)` — auto-focus on open
- `useRef(bottomRef)` — auto-scroll to latest message
- `readStream()` — custom helper that reads a `ReadableStream` and calls a setter incrementally
- Background task extraction: fires `fetch('/api/checkin', { action: 'chat' })` on first user message, does not await before showing AI response

## Acceptance criteria

- [x] Modal opens automatically once per day per device
- [x] AI greeting references the user's actual overdue/due-today tasks
- [x] AI greeting is personalized using the user's customization prompt
- [x] User can chat freely; AI responds conversationally
- [x] Tasks mentioned in chat are automatically extracted and added to the DB
- [x] Checklist shows overdue and due-today tasks
- [x] Dragging a checklist item to the timeline assigns a scheduled time
- [x] Wrap-up: AI identifies done tasks and removes them
- [x] Modal closes with a celebration on wrap-up

## Open questions

_None — feature is complete._

## Implementation notes

- `localStorage` key `checkin-last-date` stores the date string (YYYY-MM-DD); compared to today on mount.
- Background task extraction runs in a `Promise` that is not awaited — it inserts tasks silently, then the UI refreshes via `router.refresh()` on modal close.
- `readStream()` is a custom async generator in `CheckIn.tsx` — not a library. It reads chunks from a `ReadableStream`, decodes UTF-8, and appends to a state string.
- Ollama must be running locally for AI features to work. The app degrades gracefully (shows an error message in chat) if the endpoint is unreachable.
- The `finalize` action returns a JSON array of task IDs to delete — the client performs the actual Supabase delete calls so the UI can update optimistically before the modal closes.
