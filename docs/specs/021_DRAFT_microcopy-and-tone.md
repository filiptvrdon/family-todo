# Feature: App Tone & Microcopy

> **File:** `021_microcopy-and-tone.md`
> **Status:** draft

## What & Why

**Problem:** Standard system text (e.g. "No tasks", "Overdue", "Error") feels cold and can increase user stress or guilt.
**Goal:** Replace clinical system messages with a warm, human, and encouraging tone that aligns with ADHD-friendly principles.
**Not covered:** Full AI-generated personal dialogue (though AI nudges in Spec 011 complement this).

## How It Works

### Human-Friendly Phrasing
Replace existing technical labels with more supportive language.

| Original Label | New Microcopy | Purpose |
|---|---|---|
| No tasks | Nothing planned. Good time to rest or add something. | Reduces "todo-void" anxiety. |
| Overdue | Still open | Lowers guilt and stress. |
| Task created | Got it! Task added. | Positive confirmation. |
| Error: invalid date | Oops! That date doesn't look right. | Forgiving tone. |

### Tone Guidelines
- **Conversational:** Use language that sounds like a supportive friend.
- **Empathetic:** Acknowledge that life happens (e.g. "Still open" instead of "Overdue").
- **Encouraging:** Celebrate progress without being over-the-top or game-like.

### Implementation locations
- Empty state messages in `TodoList` and `Calendar`.
- Status badges on `TodoCard`.
- Confirmation toasts.
- Error messages.

## Done When

- [ ] "No tasks" message updated to something more encouraging.
- [ ] "Overdue" label updated to "Still open" or similar globally.
- [ ] Task creation and completion toasts reviewed and updated for tone.
- [ ] Error messages reviewed for empathy and clarity.

**Open questions**
- Should the user be able to customize the tone (e.g. "Sassy", "Professional", "Zen")?
- Should we use gender-neutral or user-specific pronouns if we know them?

**Implementation notes**
- Create a central `messages.ts` or similar config file to manage common UI strings.
- Audit the UI for any clinical or technical jargon that can be simplified.
