# Feature: Authentication & User Profile

> **Status:** done
> **Roadmap ref:** n/a (foundational)

## Problem

Users need a secure, low-friction way to sign in and maintain a personal identity within the app. The profile also stores per-user preferences that personalize the AI companion.

## Goal

A user can sign up, sign in, and maintain a profile (display name, avatar, AI customization prompt) with minimal friction.

## Non-goals

- Social login beyond Google (Google is only for Calendar sync, not app auth)
- Multi-factor authentication
- Role-based access control beyond the two-partner model

## Design

### User-facing behavior

1. Unauthenticated users land on `/login`.
2. Two sign-in modes: **magic link** (email only, no password) and **password** (email + password). Toggle between them via a text link.
3. On magic link: user enters email, receives link, clicks it, lands at `/auth/callback`, gets redirected to `/`.
4. On password: standard email/password form with submit.
5. On first sign-in a profile row is automatically created via a DB trigger (`on_auth_user_created`).
6. Home page (`/`) upserts the profile on every server render to ensure consistency.
7. Unauthenticated requests to `/` redirect to `/login`.
8. **Profile modal** (accessible from header): user can update display name, username, avatar (upload image), and a free-text AI customization prompt that personalizes the companion's tone and greeting.
9. Avatar uploads go to Supabase Storage bucket `avatars` (max 5 MB, JPEG/PNG/WebP/GIF).
10. Sign-out clears session and redirects to `/login`.

### UI / UX notes

- Login page: single centered card, minimal chrome.
- Profile modal: drawer/modal triggered from header avatar or name.
- Avatar shown in header as a small circle; falls back to initials if no image.

### Data model

Table: `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | references `auth.users.id` |
| `email` | text | |
| `display_name` | text | |
| `username` | text | |
| `customization_prompt` | text | fed into AI system prompt |
| `avatar_url` | text | public URL from Supabase Storage |
| `partner_id` | uuid | references another profile's `id` |
| `google_refresh_token` | text | stored for Calendar sync |
| `created_at` | timestamptz | |

DB trigger: `on_auth_user_created` → calls `handle_new_user()` to insert a profile row.

Storage bucket: `avatars` — public read, owner write.

### API / Server actions

- `GET /auth/callback` — completes the magic link OAuth exchange via Supabase, redirects to `/`.
- `GET /api/auth/google` — initiates Google OAuth for Calendar (not app auth).
- Profile reads/writes via Supabase client directly (no custom API route).

### State & client logic

- `useTheme()` — light/dark toggle persisted via `next-themes`.
- Profile form: local `useState` for each field, submitted on save.
- Avatar: file input → upload to Supabase Storage → update `avatar_url` in profile.

## Acceptance criteria

- [x] Unauthenticated user is redirected to `/login`
- [x] Magic link flow completes and creates a session
- [x] Password sign-in works
- [x] New user gets a profile row automatically
- [x] User can update display name, username, and AI customization prompt
- [x] User can upload an avatar image
- [x] Sign-out clears the session

## Open questions

_None — feature is complete._

## Implementation notes

- Profile upsert on page load (`/src/app/page.tsx`) guards against rare cases where the trigger fires late or fails.
- `customization_prompt` is injected verbatim into the AI system prompt in `/src/app/api/checkin/route.ts` — no sanitization needed as it's user-controlled and server-side only.
- Avatar URL is stored as a full public URL, not a path, so no signed-URL logic is needed.
