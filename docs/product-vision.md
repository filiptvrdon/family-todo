# Product Vision

## Core Idea

Not a todo app — a **gentle AI companion that helps two people live with less friction and more joy**. Tasks are the mechanism; wellbeing is the goal.

- Tasks are **intentions**, not demands — frame is *"what would make tomorrow-you grateful?"*, never *"what are you behind on?"*
- The AI has a real opinion: notices patterns, checks in contextually, answers *"what should I do right now?"* with genuine reasoning

---

## Data Model

Items evolve — they don't start as a type, they become one.

**One-off (default)** — name only, no date, no category. Created in 1 tap. Completion removes it.

**Scheduled** — a one-off with a time slot. Missed items surface without guilt; easy to reschedule in one tap.

**Recurring** — resets on a rhythm. Becomes recurring after creation, never forced at entry. Missed items roll over quietly — skipping is first-class, no penalty.

**Ownership** — every item belongs to someone. Defaults to creator. Both partners see each other's items; either can complete shared tasks. Dashboard always shows both side by side.

**Creation fast path:** name only → tap + → enter. Done. Date, recurrence, notes are optional, added later.

---

## Key Differentiators

### Replace the list view
The default experience is not a list:
- **Today card** — one focus task, front and center. Everything else hidden unless requested.
- **Energy/mood surfacing** — *"I have 10 minutes and low energy"* → app picks the right task
- **Conversational** — chat, not forms and checkboxes

### "Just tell me what to do" mode
For decision paralysis (the hardest ADHD symptom to design around):
- Inputs: available time + energy level
- Returns ONE task. No list, no alternatives, no chrome.
- Celebrates when done, then: *"Want to do one more?"*

### Reframe "done"
Completion is a moment, not a state change:
- Journal-like narrative: *"This week you cleared 6 things, including that dentist call you'd been avoiding"*
- Progress shown as a story, not a count or percentage bar

### Team of two
The 2-person dynamic is a product feature, not a constraint:
- Gentle mutual awareness, never competitive
- **End-of-day recap shows only wins** — what you two got done; nothing about what's left
- Partner attribution: *"[Name] just finished paying the rent"* — shoulder tap, never leaderboard
- Joint wins surfaced and celebrated warmly

### AI as real companion
Not a parser — a thoughtful presence:
- Notices avoidance: *"You tend to push dentist appointments — want help making this one stick?"*
- Checks in contextually: *"You had a big day yesterday. Want a lighter list today?"*
- **Body doubling mode**: full-screen focus with AI side-channel chat; timer hidden during session, reveals at end (*"That took 11 minutes"*) — dopamine hit from the reveal
- Micro-first-step for any procrastinated task: *"What's the very first physical action?"*

---

## What to Avoid

- Long lists, overdue counts, productivity metrics
- Generic AI responses ("Great job!") — personalization matters
- Competitive dynamics between partners or vs. past performance
- Obligation framing — never make the user feel behind or guilty
- Red for overdue states (use warm, non-alarming colors)
- Dark mode auto-switch (ADHD users benefit from visual predictability)
- Blinking, pulsing, or autoplaying elements

---

## AI Integration

Claude API is the intended backend. Key capabilities:
- Natural language task capture — extract task, date, recurrence, priority, energy level quietly; show confirmation card, not a form
- Context-aware "what next?" reasoning — energy, time available, avoidance patterns, partner activity
- Warm, personalized (never generic) response generation
- Conversational task management — add, reschedule, break down through chat
