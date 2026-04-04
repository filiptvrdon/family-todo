# Feature: Google Calendar Sync

> **Status:** done
> **Roadmap ref:** Google Calendar integration

## Problem

Users already have their life scheduled in Google Calendar. Requiring them to re-enter events in the app breaks the system-of-record trust and creates duplication.

## Goal

Users can connect their Google account and see Google Calendar events alongside app events in all calendar views — read-only, no manual re-entry.

## Non-goals

- Writing events back to Google Calendar
- Syncing multiple calendars (primary calendar only)
- Real-time webhook sync (events fetched on page load only)
- Calendar event editing within the app for Google events

## Design

### User-facing behavior

1. In the **Profile Modal**, a "Connect Google Calendar" button initiates OAuth.
2. User is redirected to Google's consent screen (calendar read scope).
3. On approval, user returns to the app and Google events appear in all calendar views.
4. Events are fetched for the next 2 weeks on every page load.
5. Google events are visually identical to app calendar events (same `EventChip` component).
6. A "Disconnect" button in the profile modal clears the connection.

### UI / UX notes

- Profile modal shows connection status: "Connected" with disconnect button, or "Connect Google Calendar" button.
- No separate settings page — all within the existing profile flow.

### Data model

- `profiles.google_refresh_token` — stores the long-lived refresh token after OAuth exchange.
- Google events are **not stored in the DB** — fetched live on each server render and passed as props.
- Google event shape: `{ id, title, start, end, allDay }` (normalized from the Google API response).

### API / Server actions

- `GET /api/auth/google` — builds the Google OAuth URL with `calendar.readonly` scope and redirects.
- `GET /api/auth/google/callback` — exchanges the authorization code for tokens, stores `refresh_token` in `profiles`.
- `POST /api/auth/google/disconnect` — sets `google_refresh_token = null` on the profile.
- `/src/lib/google-calendar.ts`:
  - `refreshAccessToken(refreshToken)` — exchanges refresh token for short-lived access token
  - `fetchGoogleCalendarEvents(accessToken, windowStart, windowEnd)` — calls Google Calendar API
- Both functions called in `/src/app/page.tsx` server component on each load.

### State & client logic

- `googleConnected` boolean prop passed from server → `Dashboard` → `ProfileModal`.
- Google events passed as a prop array from server → `Dashboard` → calendar views.
- No client-side fetching of Google events — server-side only.

## Acceptance criteria

- [x] Clicking "Connect" redirects to Google OAuth consent
- [x] After consent, Google events appear in calendar views
- [x] Events are fetched for the next 2 weeks
- [x] Disconnecting clears the stored token and hides Google events
- [x] App continues to work normally if no Google account is connected

## Open questions

_None — feature is complete._

## Implementation notes

- The refresh token is stored in plaintext in the `profiles` table. Acceptable for MVP; a secrets manager or encryption would be needed for production hardening.
- If `refreshAccessToken` fails (e.g., revoked token), the server catches the error, sets `googleConnected = false`, and renders the page without Google events — no crash.
- The 2-week window (`today` to `today + 14 days`) is hardcoded in the page server component.
- Google OAuth scopes: `https://www.googleapis.com/auth/calendar.readonly` only.
- Redirect URI must match exactly what is registered in Google Cloud Console — stored in env var `GOOGLE_REDIRECT_URI`.
