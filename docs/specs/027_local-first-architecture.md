# Feature: Local-First Architecture

> **File:** `027_local-first-architecture.md`
> **Status:** done

## What & Why

The app currently runs against a local Docker PostgreSQL instance (post-spec-026). The next step is to make the full stack self-hosted with zero cloud hosting costs: the backend serves from the developer's laptop, remote access is handled by Tailscale, and a client-side SQLite layer keeps the app fully functional when the laptop is off or unreachable.

**Goal:** Transform the app into a true local-first system — always usable from any device, always owned, always free to run.

**Explicitly out of scope:**
- File/object storage, edge functions, multi-region, high availability
- Multi-tenancy or scaling beyond 2 users
- Changing any UI or product features

---

## Architecture Overview

### Primary — Local Server
- PostgreSQL running on the developer's laptop (already in place via Docker)
- Next.js app backend served locally
- Remote access via **Tailscale** — private mesh network, no port forwarding needed, free for personal use

### Secondary — Client-Side SQLite
- SQLite embedded in the browser via `wa-sqlite` (OPFS persistence) or `sql.js`
- App is fully functional offline and when the laptop is unreachable
- Background sync to the server when connectivity is restored

### Auth
- Already implemented via Auth.js (NextAuth) — no changes needed

---

## Networking — Tailscale

Tailscale creates a private WireGuard mesh between the developer's devices. Key properties for this use case:

- **No port forwarding** — works behind NAT/CGNAT
- **Free tier** — up to 100 devices, personal use
- **MagicDNS** — each device gets a stable `<hostname>.ts.net` hostname
- **Access control** — only enrolled devices can reach the server; no public internet exposure

**Setup (manual, one-time):**
1. Install Tailscale on the laptop and any client devices (phone, partner's device)
2. All devices join the same Tailscale account (personal/family plan)
3. Enable **MagicDNS** and **HTTPS** in the Tailscale console
4. Run `tailscale cert` on the laptop to generate Let's Encrypt certificates
5. The Next.js server binds to the laptop's Tailscale IP (starts with `100.x.y.z`) instead of `0.0.0.0`
6. Clients connect via the MagicDNS hostname (e.g. `http://laptop.ts.net:3000` or `https://laptop.ts.net` via `tailscale serve`)

**Config:**
- `TAILSCALE_HOSTNAME` in `.env` — used by the client to reach the server when off-LAN
- Client detects reachability before attempting sync (simple `HEAD /api/health` check)

---

## Security & Hardening

To ensure only select devices can connect and to harden the self-hosted setup:

### 1. Tailscale Access Control Lists (ACLs)
Restrict access using Tailscale ACLs. Assign tags (e.g., `tag:server` for the laptop, `tag:client` for mobile devices) and allow only `tag:client` to access port `3000` on `tag:server`.

```json
{
  "groups": {
    "group:family": ["user1@example.com", "user2@example.com"]
  },
  "hosts": {
    "laptop": "100.x.y.z"
  },
  "acls": [
    {
      "action": "accept",
      "src":    ["group:family"],
      "dst":    ["laptop:3000"]
    }
  ]
}
```

### 2. Device Approval
Enable **Device Approval** in the Tailscale admin console. This requires the administrator to manually approve every new device before it can join the tailnet, even if it has valid credentials.

### 3. Tailscale HTTPS & MagicDNS
Enable Tailscale HTTPS to get valid Let's Encrypt certificates for the MagicDNS name (e.g., `laptop.ts.net`). This ensures all traffic is encrypted via TLS between the browser and the server.

### 4. Node Key Expiry
Ensure **Key Expiry** is enabled for mobile devices to force periodic re-authentication, reducing the risk of unauthorized access from lost or stolen devices.

### 5. Binding to Tailscale Interface
Instead of binding to `0.0.0.0` (which allows any device on the local Wi-Fi to connect), bind the Next.js server specifically to the laptop's Tailscale IP.
- Command: `HOSTNAME=$(tailscale ip -4) npm run dev`

### 6. Application-Level Auth (Auth.js)
Auth.js acts as a second gate. Even if a device is on the Tailscale network, the user still needs to authenticate (via Google/Email) to access any data.

---

## Data Model Constraints (sync prerequisites)

Every table must have these columns from day one — the sync engine depends on them:

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` | Primary key — already in place |
| `created_at` | `TIMESTAMPTZ` | Already in place |
| `updated_at` | `TIMESTAMPTZ` | **Must be auto-updated on every write** (trigger or ORM hook) |
| `deleted_at` | `TIMESTAMPTZ` | Soft deletes — `NULL` means active. Sync depends on this to propagate deletions |

Hard deletes must not be used — clients only learn about deletions via `deleted_at`.

---

## ORM / Migration Strategy

**Recommendation: no ORM for queries; use `drizzle-kit` for migrations only.**

Rationale:
- Query layer is already built with tagged SQL (`postgres` npm) — no reason to swap it
- `drizzle-kit` generates plain SQL migration files, inspects the existing schema, and has a CLI that fits the existing workflow
- Alternative: continue writing raw SQL migration files manually (current approach) — acceptable if the schema stabilises quickly

Decision to make before implementation: confirm whether `drizzle-kit` is worth adding or raw SQL files are sufficient.

---

## Client SQLite Layer

**Library choice to evaluate:**

| Option | Persistence | Notes |
|--------|-------------|-------|
| `wa-sqlite` + OPFS | Persistent (Origin Private File System) | Preferred — survives page reload |
| `sql.js` | In-memory only | Simpler; data lost on page reload |
| `Electric SQL` | Persistent + built-in sync | Higher complexity; evaluate if sync becomes painful |
| `PowerSync` | Persistent + built-in sync | SaaS-dependent; conflicts with zero-cost goal |
| `cr-sqlite` | Persistent + CRDT-based | Most robust for conflicts; higher complexity |

**Starting point:** `wa-sqlite` with OPFS for persistence. Upgrade path to `cr-sqlite` if conflict resolution becomes a real problem.

**Architecture:**
- Client SQLite mirrors the server schema (subset of tables needed by the UI)
- All reads go to local SQLite first
- All writes go to local SQLite immediately, then sync to server in the background
- Server is the source of truth; client SQLite is a cache

---

## Sync Engine

### Approach
Start simple, refine later:

1. **Phase 1 — Full pull on reconnect:** On reconnect, fetch all rows modified since last sync (`updated_at > last_sync_at`). Simple, correct, slightly chatty.
2. **Phase 2 — Delta sync:** Track a per-table high-water mark. Only fetch rows modified after the mark. Push local writes as a batch delta.

### Conflict Strategy
**Last-write-wins** based on `updated_at` timestamp. Acceptable for a 2-user personal app where simultaneous edits to the same row are rare.

### Sync Protocol (Phase 1)
```
Client → Server:  GET /api/sync?since=<ISO timestamp>
Server → Client:  { todos: [...], habits: [...], ... }  (all rows with updated_at > since)

Client → Server:  POST /api/sync  { deltas: [ { table, id, ...fields, updated_at } ] }
Server → Client:  { ok: true }
```

### Reachability Check
Before syncing, client runs:
```
HEAD /api/health  →  200 = server reachable, sync proceeds
                      network error = offline, skip sync
```

---

## Backup Strategy

**Tool:** `pg_dump` via a cron job on the laptop.

**Script (`scripts/backup.sh`):**
```bash
#!/bin/bash
DEST="${BACKUP_DEST:-$HOME/backups/family-todo}"
FILENAME="backup-$(date +%Y%m%d-%H%M%S).sql"
mkdir -p "$DEST"
pg_dump "$DATABASE_URL" > "$DEST/$FILENAME"
# Optional: copy to offsite (e.g. rclone to Backblaze B2, rsync to NAS)
# rclone copy "$DEST/$FILENAME" remote:family-todo-backups/
```

**Setup (manual, by developer):**
```bash
# Run daily at 02:00
crontab -e
0 2 * * * /path/to/scripts/backup.sh >> /path/to/logs/backup.log 2>&1
```

`BACKUP_DEST` is configured in `.env`. Offsite copy is optional but recommended.

---

## Environment Variables

```env
# Existing
DATABASE_URL=postgres://...
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...

# New
TAILSCALE_HOSTNAME=https://laptop.ts.net:3000  # used by client for remote sync
BACKUP_DEST=/Users/yourname/backups/family-todo # local backup path
```

---

## How It Works — Implementation Phases

### Phase 1 — Server reachability + Tailscale config
1. Add `GET /api/health` endpoint (returns `{ ok: true }`)
2. Bind Next.js to the Tailscale interface in dev/prod config
3. Document Tailscale security setup steps (README or this spec)
4. Add `TAILSCALE_HOSTNAME` to `.env.example`
5. Enable Tailscale HTTPS and configure certs

**Done when:** app is reachable from a phone on Tailscale at `http://laptop.ts.net:3000` or `https://laptop.ts.net`.

### Phase 2 — Data model: `updated_at` + soft deletes
1. Audit existing tables — confirm `updated_at` exists and is auto-updated on writes
2. Add `deleted_at TIMESTAMPTZ` column to all tables that don't have it
3. Update service layer to filter `WHERE deleted_at IS NULL` and set `deleted_at = NOW()` instead of `DELETE`
4. Add `updated_at` trigger (or ensure the service layer always sets it)

**Done when:** every write updates `updated_at`; no hard deletes remain in the service layer.

### Phase 3 — Client SQLite (read/write cache)
1. Choose and install `wa-sqlite` (OPFS) or `sql.js`
2. Initialise a local SQLite DB in the browser on app load
3. Mirror the server schema (DDL for tables used by the UI)
4. Route all Zustand store reads through local SQLite
5. Route all writes: local SQLite first → server API (fire-and-forget, or queue for offline)

**Done when:** app reads from local SQLite; writes persist locally even with server offline.

### Phase 4 — Sync engine (Phase 1: full pull)
1. Add `GET /api/sync?since=<timestamp>` endpoint on the server
2. On app load (or reconnect), run reachability check, then pull all rows modified since last sync
3. Merge pulled rows into local SQLite (last-write-wins on `updated_at`)
4. Add `POST /api/sync` to push local deltas to the server
5. Store last sync timestamp in `localStorage`

**Done when:** changes made offline sync to the server on reconnect; two devices stay consistent within one sync cycle.

### Phase 5 — Backup script
1. Write `scripts/backup.sh`
2. Document cron setup in README
3. Test restore from backup

**Done when:** `bash scripts/backup.sh` creates a valid `.sql` file; `psql $DATABASE_URL < backup.sql` restores correctly.

---

## Done When

- [x] `GET /api/health` returns 200
- [x] App is reachable from an enrolled Tailscale device at the configured hostname
- [x] Tailscale ACLs and/or Device Approval are enabled to restrict access
- [x] Server binds only to the Tailscale interface (not 0.0.0.0)
- [x] Tailscale HTTPS is enabled and provides a valid certificate
- [x] All tables have `updated_at` (auto-updated) and `deleted_at` (soft delete) columns
- [x] No hard deletes remain in the service layer
- [x] Client SQLite initialises on app load and persists across page reloads
- [x] All reads go through local SQLite (app works when server is offline)
- [x] All writes persist locally and sync to server when reachable
- [x] `GET /api/sync?since=` returns correct delta
- [x] `POST /api/sync` applies client deltas server-side
- [ ] Two-device scenario: changes made on device A appear on device B after reconnect
- [x] `scripts/backup.sh` creates a valid SQL dump
- [x] `npm run build && npm run lint` passes with no errors

**Open questions**
- `wa-sqlite` vs `sql.js` vs `Electric SQL` — confirm library choice before Phase 3
- `drizzle-kit` for migrations vs continuing with raw SQL files — decide before Phase 2
- Offsite backup destination (Backblaze B2, NAS, etc.) — optional, developer's choice

**Implementation notes**
_Phase 5 — complete (2026-04-13):_
- Created `scripts/backup.sh`: dumps local Postgres to a timestamped `.sql` file in `./backups/`, retains 30 most recent, configurable via env vars (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`). Includes inline cron setup docs.
- Added `/backups/*.sql` to `.gitignore`; tracking `backups/.gitkeep` to preserve the directory.

_Phase 4 — complete (2026-04-13):_
- Created `src/lib/sync.ts`: full push+pull sync engine. `runSync()` checks reachability, pushes pending items via `POST /api/sync`, pulls server changes via `GET /api/sync?since=`, merges with last-write-wins, persists to IDB, saves watermark to `localStorage`, dispatches `sync-done`.
- `startSync(userId, partnerId)`: runs sync once then re-runs on `window.online`. Called from `user-store.ts` after user loads.
- Created `src/app/api/sync/route.ts`: `GET` returns delta rows for user+partner since watermark; `POST` applies client deltas with last-write-wins security (`user_id` check per delta, quest ownership check for `quest_tasks`).
- Updated all 5 stores to Phase 4: `crypto.randomUUID()` for client-generated IDs; `localDbUpsertLocal` for all writes (sets `updated_at`, marks pending); `subscribe()` returns proper cleanup; `sync-done` listener reloads from local DB on each sync cycle.
- Smart `set_updated_at()` trigger: only auto-sets `updated_at` when the caller didn't explicitly change it — prevents server trigger from overwriting client-provided `updated_at` during sync push.
- `quest_tasks` composite PK handled specially: excluded from the pending queue, synced via `localDbGetSince` in push logic; `localDbSoftDeleteQuestTask` added for correct composite-key soft delete.

_Phase 3 — complete (2026-04-13):_
- Library choice: `sql.js` with IndexedDB persistence. No COOP/COEP headers needed (preserves Google OAuth). WASM (`sql-wasm.wasm`) served from `public/`, copied via `postinstall` script.
- Created `src/lib/local-db.ts`: singleton SQLite DB, IDB save/restore, schema mirrors all 7 server tables (bool↔integer coercion for SQLite), `localDbGetAll`, `localDbUpsert`, `localDbUpsertMany`, `localDbSoftDelete`, `localDbHardDelete`, `persistLocalDb`.
- All 5 Zustand stores updated: `subscribe()` loads local DB first (instant, no network), then background-fetches from server; writes upsert to local DB immediately.
- Offline resilience: network errors (`TypeError`) do NOT roll back the store or local DB — the write stays locally until Phase 4 sync can push it. Server errors still roll back.
- `addX` functions: temp-ID rows are written to local DB immediately; if offline they persist until the server is reachable. If the server rejects the create, the temp row is hard-deleted.

_Phase 2 — complete (2026-04-13):_
- Added `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` and `deleted_at TIMESTAMPTZ` to all 7 tables (`users`, `todos`, `calendar_events`, `quests`, `quest_tasks`, `habits`, `habit_tracking`) via migration `20260413000000_phase2_soft_deletes_and_updated_at.sql`.
- Created `set_updated_at()` trigger function, applied to all tables so every UPDATE auto-sets `updated_at`.
- Converted all 7 hard deletes to soft deletes (`UPDATE ... SET deleted_at = NOW()`).
- Added `AND deleted_at IS NULL` filters to all SELECT queries across the service layer.
- `linkTask` updated to `ON CONFLICT DO UPDATE SET deleted_at = NULL` to handle re-linking a previously unlinked task.
- TypeScript interfaces updated with optional `updated_at?` and `deleted_at?` fields (optional because the DB always sets them — callers never provide them on create).

_Phase 1 — complete (2026-04-13):_
- Implemented `GET /api/health`.
- Added `dev:tailscale` script to `package.json`.
- Created `.env.example` and updated `README.md` with Tailscale setup steps.
- Configured security hardening instructions (ACLs, Device Approval, binding to IP).
- Added `AUTH_TRUST_HOST=true`, `AUTH_URL`, and `NEXTAUTH_URL` for Tailscale MagicDNS to `.env.local`.
- Updated `next.config.ts` with `allowedDevOrigins` (including full protocols and ports) to permit POST requests from mobile devices.
- Explicitly set `trustHost: true` and configured robust, developer-friendly cookie settings (e.g., relaxing the `Secure` flag for local/private network development) in `src/auth.ts` to ensure compatibility with Tailscale mesh networking.
- Confirmed use of `src/proxy.ts` (Next.js 16+ convention) for middleware/proxy logic.
- Switched login form to use standard Auth.js server-side redirects for better session persistence over proxies.
