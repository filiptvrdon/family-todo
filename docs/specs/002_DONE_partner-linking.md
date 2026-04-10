# Feature: Partner Linking

> **Status:** done
> **Roadmap ref:** n/a (foundational)

## Problem

The app is designed for two people. Without a way to link accounts, each user only sees their own tasks — the core collaborative value is lost.

## Goal

Two users can link their accounts so they can see each other's tasks and calendar events.

## Non-goals

- Groups larger than two
- Granular permission controls (e.g., hide specific tasks from partner)
- In-app invitation flow with email notification (currently enter email manually)

## Design

### User-facing behavior

1. If no partner is linked, a **PartnerConnect** prompt appears in the task board.
2. User enters their partner's email address and submits.
3. The app looks up the profile with that email and sets `partner_id` on both profiles (bidirectional link).
4. Once linked, a **Me / Partner** tab switcher appears at the top of the task board.
5. "Me" shows the logged-in user's todos; "Partner" shows the partner's todos (read-only).
6. Partner todos display a name/avatar badge indicating ownership.
7. Disconnecting a partner clears `partner_id` on both profiles.

### UI / UX notes

- Connect form: simple email input with a "Connect" button. Shown only when `partner_id` is null.
- View switcher: two pill-style tabs ("Me" / partner's display name or "Partner").
- Partner tasks are visually distinguished (badge, potentially muted action buttons).
- See `docs/design-visual-guidelines.md` for color conventions.

### Data model

- `profiles.partner_id` — uuid foreign key referencing another profile's `id`. Null if no partner linked.
- Bidirectional: when user A sets `partner_id = B`, user B's `partner_id` is also set to A in the same operation.

RLS policies on `todos`, `calendar_events`, `profiles` all allow reads when `auth.uid() = user_id OR auth.uid() = (SELECT partner_id FROM profiles WHERE id = user_id)`.

### API / Server actions

- Partner lookup and `partner_id` update done via Supabase client directly (no custom route).
- Disconnect: sets `partner_id = null` on both profiles.

### State & client logic

- `useState('me' | 'partner')` in `TaskBoard` drives which todo list is shown.
- `showConnect` boolean in `TaskBoard` toggles the connect form.
- Partner profile (display name, avatar) is server-loaded on the home page and passed as props.

## Acceptance criteria

- [x] User with no partner sees the connect prompt
- [x] Entering a valid partner email links both accounts bidirectionally
- [x] Me/Partner view switcher appears after linking
- [x] Partner's tasks are visible but not editable
- [x] Disconnecting clears the link on both sides

## Open questions

_None — feature is complete._

## Implementation notes

- Partner relationship is purely a `profiles` column — no separate join table. Simple but means only one partner per user is possible by design.
- RLS policies enforce read-only access to partner data at the DB level; the UI hides edit controls on partner todos as a second layer.
- Server load in `/src/app/page.tsx` fetches both user and partner profiles, todos, and calendar events in parallel for performance.
