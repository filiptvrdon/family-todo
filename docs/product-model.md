# Product Model

How the app works — the mental model before the implementation.

---

## Core Idea

Tasks are just tasks. The app doesn't ask you to categorise them upfront.
Structure is added *after* creation, only when it's useful.

The default path is: type a name, hit enter. Done.

---

## Item Types

Items evolve — they don't start as a type, they become one through use.

### 1. One-off (default)
A task with no date and no recurrence. The baseline. Created instantly.

> "Buy milk"
> "Call the landlord"
> "Fix the squeaky drawer"

Completion removes it. No drama.

### 2. Scheduled
A one-off that has been given a specific time slot — either a deadline ("do this by Friday") or a fixed appointment ("dentist at 3pm").

Becomes scheduled by:
- Dragging it onto the calendar
- Typing a date/time naturally (stretch goal: NLP parsing)
- Tapping a date picker after creation

When a scheduled item is missed, it doesn't silently disappear — it surfaces as overdue without guilt. Easy to reschedule with a single tap.

### 3. Recurring
A task that resets on a rhythm. Daily, weekly, monthly — or custom.

Becomes recurring by:
- Completing it and tapping "repeat this"
- Long-pressing and selecting a recurrence
- Never by forcing the user to decide at creation time

When missed: rolls over quietly. The goal is awareness, not punishment.
Skipping is a first-class action — no guilt, no asterisk.

---

## Ownership

Every item belongs to someone — you or your partner. This is always visible.

- Items default to the creator
- Reassigning is one tap
- Both people can see each other's items (read-only by default)
- Either can complete a shared/partner task (configurable)

The dashboard always shows both people's items side by side — not as a judgement, but as a shared picture of what's going on.

---

## The "What Should I Do Next?" View

The most important view in the app. One item. Not a list.

Surfaces the single most relevant task for you right now, based on:
- Due date / urgency
- How long it's been sitting there
- Time of day (morning vs evening tasks)
- What your partner has recently done (reciprocity nudge)

You can skip it (no penalty), complete it (celebration), or ask for another one.

---

## Creation Flow

**Fast path:** Name only. Tap +, type, enter. One field, one action.

**Progressive detail:** After creation, the item sits in the list. You can tap it to add:
- A date or time slot
- Recurrence
- Notes / sub-steps
- Reassign to partner

Nothing is required. Everything is optional.

---

## Completion & Celebration

Completing a task should feel good — especially for ADHD brains that need that dopamine hit.

- Satisfying animation on completion
- Positive micro-copy ("Nice one!", "One less thing ✓")
- Partner can see what you completed today
- Weekly summary: "You two knocked out 23 things this week 🎉"

Recurring tasks reset quietly and reappear at the right time — no fanfare, no nag.

---

## What the App Does NOT Do

- Ask you to choose a category before you create a task
- Show a long flat list of everything at once
- Make missed tasks feel like failures
- Require both people to use it the same way
