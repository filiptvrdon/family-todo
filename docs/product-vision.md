# Product Vision

## The core idea

This is not a todo app. It is a **gentle AI companion that helps two people live their lives with less friction and more joy** — and tasks happen to be how it does that.

That framing changes everything: the language, the UI, the interactions, the notifications. It is not about productivity — it is about wellbeing.

---

## What makes it different

### Shift the mental model

Most todo apps are lists of obligations. This app is not.

- Tasks are **intentions**, not demands
- The framing is *"what would make tomorrow-you grateful?"* — not *"what are you behind on?"*
- Language and UI treat the user as capable and worthy of care, not as someone who needs to be managed

### The AI is a real companion, not a parser

The AI does more than extract task fields from natural language. It:

- Notices patterns: *"You tend to push dentist appointments — want help making this one stick?"*
- Checks in contextually: *"You had a big day yesterday. Want a lighter list today?"*
- Celebrates in a personal, non-generic way
- Answers *"what should I do right now?"* with genuine reasoning — factoring in energy level, available time, mood, and history — not just sorting by priority

This is the biggest differentiator and should be treated as a core feature, not a nice-to-have.

### Replace the list view

The default experience is not a list.

- **Today card** — one focus task, front and center. Everything else is hidden unless explicitly requested
- **Mood-based / energy-based surfacing** — *"I have 10 minutes and low energy"* → app picks the right task
- **Conversational interface** — users interact through chat, not forms and checkboxes
- Lists are available but opt-in, not the primary surface

### Reframe what "done" means

Completing a task is not just a checkbox state change — it becomes part of a story.

- A journal-like log surfaces naturally: *"This week: you cleared 6 things, including that dentist call you'd been avoiding"*
- Progress is shown as a narrative, not just a count or a percentage bar
- Completion feels like a moment, not an update

### Lean into being a team of two

The 2-person aspect is a genuine product feature, not a constraint.

- Shared tasks feel qualitatively different from solo ones
- Gentle mutual awareness: *"Your partner also completed something today"*
- Celebrate each other's wins — quietly, warmly, without competition
- No leaderboards, no pressure — just quiet mutual support

### "Just tell me what to do" mode

Decision paralysis is one of the hardest ADHD symptoms to design around. This mode hands over control completely:

- User says: *"I have 20 minutes and low energy — what should I do?"*
- App picks ONE task, surfaces it with a gentle nudge
- No list visible, no distractions, no choices
- Celebrates when done, then asks: *"Want to do one more?"*

---

## What to avoid

- **The todo app trap** — long lists, overdue counts, productivity metrics
- **Generic AI** — confetti and "Great job!" are not companion behavior; personalization matters
- **Competitive dynamics** — between partners or against past performance
- **Obligation framing** — the app should never make the user feel behind or guilty

---

## AI integration notes

The Claude API is the intended backend for all AI features. Key capabilities to build around:

- Natural language task capture with intent extraction
- Context-aware "what next?" recommendations
- Pattern recognition over time (what gets avoided, what gets done well)
- Personalized, warm, non-generic response generation
- Conversational task management (add, reschedule, break down — all through chat)

See also: [ADHD/Neurodivergent Design Principles](./design-adhd-principles.md) — many of the AI behaviors above directly serve those goals.
