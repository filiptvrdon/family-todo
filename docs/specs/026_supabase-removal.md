# Feature: Remove Supabase — Migrate to Vanilla PostgreSQL

> **File:** `026_supabase-removal.md`
> **Status:** done

## What & Why

Supabase free-tier egress limit (5 GB/month) is being blown through during local development, because the running Next.js app always connects to the remote hosted Supabase instance. The fix is to remove Supabase entirely and run a vanilla PostgreSQL container locally (and on a self-hosted or cheap managed host for production).

**Goal:** Replace all Supabase primitives (auth, database client, realtime, storage) with lightweight, framework-native alternatives that run against a plain PostgreSQL 17 instance.

**Explicitly out of scope:**
- Changing any UI or product features
- Adding new tables or schema changes
- Selecting a production host (that's a follow-up decision)

---

## Supabase Primitives In Use (audit)

| Primitive | Scope | Replacement |
|-----------|-------|-------------|
| Database queries (`supabase.from()`) | ~64 calls across 5 service files + server components | `postgres` npm package (tagged SQL) |
| Auth (session, signIn, signOut, middleware) | login page, middleware, 7 API routes | Auth.js v5 (NextAuth) — credentials + Google provider |
| Realtime (`supabase.channel()`) | 5 Zustand stores (todos, user, quests, events, habits) | Polling (fetch on interval) |
| Storage (avatars) | `UserModal.tsx` | Store as `bytea` in the `users` table |
| RPC (`process_daily_momentum`) | `src/lib/momentum.ts` | Inline SQL function call via direct DB client |
| RLS policies | All tables | Remove — enforce in application layer instead |

---

## Architecture Decisions

### Auth → Auth.js v5
- Supports email/password (Credentials provider) and Google OAuth out of the box
- Integrates with Next.js App Router via `auth()` helper — replaces `supabase.auth.getUser()`
- Session stored in a signed JWT cookie — no separate session table needed
- `middleware.ts` becomes a simple `auth` export from Auth.js

### DB client → `postgres` (npm)
- Tagged template literal SQL: `` sql`SELECT * FROM todos WHERE user_id = ${id}` ``
- Zero abstraction overhead, stays close to the existing service layer
- No ORM migrations — existing `supabase/migrations/*.sql` files are reused (minus the Supabase-specific parts)

### Realtime → polling
- Each Zustand store replaces its `supabase.channel()` subscription with a `setInterval` fetch every **5 seconds** when the window is focused
- Good enough for a 2-user family app; no WebSocket infrastructure needed
- Can upgrade to SSE later if needed

### Storage → DB column
- Add `avatar_data` (`bytea`) + `avatar_mime` (`text`) to the `users` table
- Served via a `/api/avatar/[userId]` route that streams the bytes
- Removes the need for a separate S3/object-storage service

### RLS → application layer
- All RLS policies are dropped
- Service layer already scopes queries by `userId` from the session — no data leaks possible
- Partner visibility enforced in service functions (already partially the case)

---

## How It Works — Implementation Phases

### Phase 1 — Local Docker PostgreSQL (infrastructure)
1. Add `docker-compose.yml` with `postgres:17-alpine` (fixed minor version `17.4`)
2. Dump remote Supabase schema + data via `pg_dump` (connection string from Supabase dashboard → Settings → Database)
3. Strip Supabase-specific objects from the dump: `auth.*` schema, RLS policies, Supabase extensions (`supabase_migrations`, `pg_graphql`, etc.)
4. Import cleaned dump into the Docker container
5. Add `DATABASE_URL` env var; verify connection with `psql`

**Done when:** `psql $DATABASE_URL -c "SELECT COUNT(*) FROM todos"` returns correct row count locally.

### Phase 2 — Replace DB client
1. Install `postgres` npm package
2. Create `src/lib/db.ts` — single DB client instance
3. Rewrite `src/services/*.ts` (5 files) to use tagged SQL instead of `supabase.from()`
4. Rewrite `src/app/page.tsx` and API routes that do server-side DB calls
5. Move `process_daily_momentum` RPC logic to an inline SQL call
6. Remove RLS from the schema (migration file to drop all policies)
7. Keep Supabase auth temporarily — DB queries now bypass it

**Done when:** all pages load and CRUD operations work against local Docker DB.

### Phase 3 — Replace Auth
1. Install `next-auth@beta` (v5)
2. Create `src/auth.ts` — configure Credentials provider (email + bcrypt password) + Google provider
3. Create `src/app/api/auth/[...nextauth]/route.ts`
4. Rewrite `src/middleware.ts` — replace Supabase session check with Auth.js `auth` export
5. Rewrite `src/app/login/page.tsx` — use `signIn()` from Auth.js
6. Replace all `supabase.auth.getUser()` calls in API routes and server components with `auth()` from Auth.js
7. Add `password_hash` column to `users` table; backfill a temporary password for existing users (or require reset on first login)
8. Add Auth.js env vars: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
9. Remove `/app/auth/callback/route.ts` (Supabase OAuth callback — Auth.js handles this internally)

**Done when:** can log in with email/password and Google OAuth, session persists across refreshes, unauthenticated routes redirect to `/login`.

### Phase 4 — Replace Realtime + Storage + cleanup
1. **Realtime:** Replace `supabase.channel()` in all 5 Zustand stores with a `usePolling(fn, 5000)` hook that re-runs the fetch on interval (pausing when window is hidden)
2. **Storage:** Add `avatar_data bytea`, `avatar_mime text` to `users`; rewrite `UserModal.tsx` upload/download; add `/api/avatar/[userId]/route.ts`
3. **Cleanup:**
   - Remove `@supabase/supabase-js` and `@supabase/ssr` from `package.json`
   - Delete `src/lib/supabase/` directory
   - Delete `supabase/` directory (config, migrations no longer needed — schema is now owned by Docker)
   - Remove `scripts/db-local-start.sh` etc. (replaced by `docker compose up`)
   - Update `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars → `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_*`

**Done when:** zero Supabase imports remain, `npm run build` passes, app fully functional.

---

## Done When (overall)

- [ ] `docker compose up` starts a local PostgreSQL 17.4 container with all data
- [ ] All data operations (todos, quests, habits, events, users) work via direct SQL
- [ ] Login with email/password works via Auth.js
- [ ] Login with Google OAuth works via Auth.js
- [ ] Session persists; unauthenticated routes redirect to `/login`
- [ ] Partner data visibility works (user sees partner's todos/events/habits)
- [ ] Realtime updates work via polling (changes appear within ~5 seconds)
- [ ] Avatar upload/display works via DB storage
- [ ] Zero `@supabase/*` imports remain
- [ ] `npm run build && npm run lint` passes with no errors

**Open questions**
- Production host: TBD — local Docker for now. If the PWA needs to be reachable from phones outside the house, a hosted DB (e.g. Railway) will be needed later. No code change required — just swap `DATABASE_URL`.

**Decisions**
- Magic-link / OTP login: **dropped**. Credentials (email + password) + Google OAuth only.
- Password migration: **no ID changes needed**. Auth.js Credentials provider returns the existing UUID from the `users` table, so all FK references stay intact. Migration = add `password_hash` (bcrypt) column to `users`, set new passwords for 2 users manually.
- DB image: `postgres:17.4-alpine` (pinned minor version).

**Implementation notes**
- Phase 1: Docker PostgreSQL 17.4-alpine on port 5433. Data migrated from remote Supabase via pg_dump.
- Phase 2: postgres npm for all service layer queries. Client components use fetch() to API routes. Zustand stores replaced Supabase Realtime with 5-second polling. New batch endpoint GET /api/todos/quest-links added.
- Phase 3: Auth.js v5 (next-auth@beta) with Credentials and Google providers. Next.js 16 uses proxy.ts (not middleware.ts) for middleware. bcrypt password hash set for existing user.
- Phase 4: Avatar stored as bytea in users table; served via GET/POST /api/avatar/[userId]. avatar_data serialized as boolean flag in User type (presence indicator). Supabase packages fully removed.
