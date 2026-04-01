# Product Roadmap

This is the living roadmap for Family Todo. Features are grouped by tier (impact / build order), with status tracked per feature.

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done · `[-]` deferred

---

## Tier 1 — Make the AI real

These are the highest-leverage features. They are what separates this product from a todo app. Build these first.

### [x] Daily check-in (morning brain dump)
The heartbeat of the app. Replaces the dashboard as the primary onramp.
- Morning prompt: "What's on your mind today?"
- User dumps everything in free text
- AI organizes silently in the background (extracts tasks, assigns priority/category)
- User sees a simple Today card, not a form or a list
- **Component:** `CheckIn.tsx`

### [ ] "What should I do right now?"
Single most important feature. Turns the product from a list into a companion.
- One button on the home screen
- Two inputs: available time (preset: 5 / 15 / 30 / 60+ min) and energy level (low / medium / high)
- Returns ONE task card — no list, no alternatives shown
- AI reasons over: due dates, avoidance patterns, energy match, time estimate
- Celebration when done, then: "Want to do one more?"
- **UI:** Full-screen single-card mode. No chrome. No distractions.

### [ ] Proactive AI prioritization
The AI has an opinion — it surfaces it unprompted, not just when asked.
- On dashboard load, AI recommends a "focus for today" with a short reason: *"This has been waiting 3 weeks and takes 10 minutes — today feels right."*
- Tracks avoidance patterns: tasks that keep getting skipped get a quiet flag
- Considers time of day, partner activity, energy history
- Never surfaces as a nag — always as a warm suggestion, easily dismissed

### [ ] Natural language task capture (full)
Capture a task in 2 seconds with no form.
- Single input: "What's on your mind?"
- AI extracts: task name, due date, recurrence, priority, energy level, category
- User sees a confirmation card (not a form) before saving
- Supports: "Call dentist tomorrow at 3pm", "Pay rent every 1st, remind me the day before"
- **Partial foundation exists** in `CheckIn.tsx` — extend, don't reinvent

---

## Tier 2 — Body doubling & focus sessions

Under-explored by competitors. Genuinely valuable for ADHD users.

### [ ] "Let's tackle this together" — body doubling mode
A dedicated full-screen focus mode where the AI accompanies the user through a task.
- User selects a task → enters body doubling mode
- Timer starts **hidden** (this is intentional — time blindness is real)
- AI opens a side-channel chat: helps break down the task, talks through blockers, keeps attention
- AI suggests the **micro-first-step**: "What's the very first physical action?" (e.g. "Open the doc" not "Write the report")
- When done: hidden timer **reveals** — "That took 11 minutes." → dopamine hit
- Post-session: short summary card added to activity log
- **UI:** Full-screen, minimal chrome, single-task focus. Separate route or modal mode.

### [ ] Micro-first-step (standalone)
Available outside body doubling too — for any task the user is procrastinating on.
- On any task card: "Help me start" button
- AI responds with the single smallest possible first action
- Designed to break initiation paralysis

### [ ] Focus session history / activity log
A journal-like view of completed sessions.
- Not a productivity metric — framed as a "what you've been up to" narrative
- Surfaced in end-of-day recap (see Tier 4)
- Stores: task completed, time taken, session type, date

---

## Tier 3 — Notifications & re-engagement

Table stakes, but the *how* is the differentiator.

### [ ] PWA push notifications
Infrastructure for all notification features below.
- Service worker registration
- Push subscription management (per user, stored in DB)
- Notification permission request — non-intrusive, explained in context
- **Engineering note:** See `docs/engineering-conventions.md#mobile-first-pwa`

### [ ] Non-guilt reminders
Friendly, warm notifications. Never "overdue."
- Language: "Hey, the dentist thing is still waiting for you when you're ready 🌊" not "OVERDUE: Call dentist"
- Uses Sunset Coral (`#FF9F7F`), never red — see `docs/design-visual-guidelines.md`
- Smart timing: learns when the user actually acts on notifications; avoids sending at ignored times

### [ ] Guilt-free snooze
From any notification, one tap to defer without friction or shame.
- Options: "Not today" (24h), "This week" (Sunday), "Someday" (backlog, no deadline)
- No confirmation dialog. No judgment. No "are you sure?"
- Task state updates silently in background

---

## Tier 4 — Partner layer & shared wins

The couple-specific features are the product's moat. No other app does this.

### [ ] End-of-day wins recap
6pm notification: here's what you two got done today.
- **Only shows wins** — not what's left, not what's overdue
- Warm, personal copy — not generic "Great job!"
- Builds on: push notification infra + activity log
- Example: "Today you two handled 4 things including that dentist call you'd been putting off. Nice."

### [ ] Partner attribution (real-time)
Quiet, warm notification when your partner completes something.
- "[Name] just finished paying the rent 🌊"
- Never competitive — celebratory, like a gentle shoulder tap
- Opt-in per user (some people don't want real-time pings)

### [ ] Shared streaks & joint wins
Optional gamification — never punishing, always celebratory.
- "You two have handled groceries 4 weeks in a row"
- Joint achievement cards surfaced at end-of-week
- Opt-in. Not shown by default until the couple has been active for a few weeks.

### [ ] Partner awareness on dashboard
Gentle presence of your partner in the main view.
- "Anna also completed something today" — no details unless shared
- Shared tasks show both avatars; assignment is visible at a glance
- No leaderboard, no comparison

---

## Deferred / Future

These are valid ideas that don't fit the current build order. Revisit after Tier 1–3 are solid.

- **Time blocking** — scheduling tasks into calendar slots (builds on SharedCalendar)
- **Deadline backwards planning** — "to finish by Friday, start Wednesday"
- **Recurring task templates** — reduce repeated decisions for common task types
- **Energy-level history** — track patterns over time to improve "what should I do?" recommendations
- **Commitment devices** — optional accountability prompts with partner visibility

---

## How to use this document

- **Before building any feature:** check this file. If it is listed here, read the description carefully — the design intent matters. Do not reinvent from scratch; look for existing components that partially implement it.
- **After shipping a feature:** update its status from `[ ]` to `[x]`. Add a one-line note about which component(s) implement it.
- **When discovering that a feature is partially built:** update the status to `[~]` and add a note about what exists and what's missing.
- **When the product direction changes:** update this file. It is the authoritative source of what we are building and why.
