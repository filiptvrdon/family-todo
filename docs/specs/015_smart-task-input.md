# Feature: Smart Task Input

> **File:** `015_smart-task-input.md`
> **Status:** draft

## What & Why

**Problem:** Manually setting dates, times, and linking tasks to quests requires multiple clicks and breaks the flow of capturing thoughts.
**Goal:** A smart input field that auto-parses natural language and suggests quest links as the user types.
**Not covered:** Full AI-driven project management or deep dependency parsing.

## How It Works

### NLP Date/Time Parsing
As the user types into the task creation input, the system identifies keywords for dates and times.
- Typing "tomorrow" or "wednesday" sets the `due_date`.
- Typing "5pm" or "noon" sets the `scheduled_time`.
- Visual feedback: Parsed terms are subtly highlighted or shown as "ghost" badges within the input to confirm they were understood.

### Smart Quest Linking
The input field monitors the text for keywords matching existing Quest names.
- Example: Typing "gym" or "workout" suggests linking to the "💪 Strength quest".
- Suggestion appears as a small icon or tag that the user can confirm with `Tab` or by clicking.

### Inline Confirmations
When a task is added with parsed attributes, the UI provides a brief visual confirmation:
- "Task added for tomorrow at 5:00 PM."

## Done When

- [ ] NLP parsing library (e.g. `chrono-node` or similar) integrated with task input.
- [ ] Dates and times are correctly parsed and populated in the task object.
- [ ] Quest names are matched against task title keywords.
- [ ] Matching Quest is suggested via an icon or tag during typing.
- [ ] User can accept a suggestion or allow the parser to handle dates without leaving the keyboard.

**Open questions**
- Should we use full LLM-based parsing (e.g. via Claude/GPT) or lightweight regex/Chrono?
- How to handle ambiguous terms (e.g. "Monday" - next week or this week?)

**Implementation notes**
- Use `chrono-node` for local, fast date parsing.
- Simple keyword fuzzy matching for quests (maybe using `fuse.js`).
