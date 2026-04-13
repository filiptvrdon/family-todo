/**
 * Client-side sync engine.
 * Browser-only — never import this from server components or API routes.
 *
 * Flow on runSync():
 *   1. HEAD /api/health — abort if server unreachable
 *   2. POST /api/sync  — push pending local changes (last-write-wins on server)
 *   3. GET  /api/sync?since=last_sync_at — pull server changes
 *   4. Merge pulled rows into local SQLite
 *   5. Persist local DB to IndexedDB
 *   6. Save last_sync_at to localStorage
 *   7. Dispatch 'sync-done' so stores reload from local DB
 *
 * startSync(userId, partnerId):
 *   Runs sync once, then wires window.online to re-run on reconnect.
 *   Call once after the user is authenticated.
 */

import {
  localDbGetById,
  localDbGetSince,
  localDbGetQuestTask,
  localDbUpsert,
  persistLocalDb,
  getPendingItems,
  clearPendingItem,
} from '@/lib/local-db'

// ── localStorage keys ─────────────────────────────────────────────────────────

const LAST_SYNC_KEY = 'sync:last_sync_at'

export function getLastSyncAt(): string {
  if (typeof window === 'undefined') return new Date(0).toISOString()
  return localStorage.getItem(LAST_SYNC_KEY) ?? new Date(0).toISOString()
}

function setLastSyncAt(ts: string): void {
  if (typeof window !== 'undefined') localStorage.setItem(LAST_SYNC_KEY, ts)
}

// ── Sync state ────────────────────────────────────────────────────────────────

let syncing = false

// ── Public API ────────────────────────────────────────────────────────────────

/** Run a full push+pull sync cycle. Safe to call concurrently — skips if already running. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function runSync(_userId: string, _partnerId: string | null): Promise<void> {
  if (typeof window === 'undefined' || syncing) return
  syncing = true

  try {
    // 1. Reachability check
    const online = await fetch('/api/health', { method: 'HEAD' }).then(r => r.ok).catch(() => false)
    if (!online) return

    const lastSyncAt = getLastSyncAt()

    // 2. Push pending local changes to server
    await pushPending(lastSyncAt)

    // 3. Pull server changes since last sync
    const res = await fetch(`/api/sync?since=${encodeURIComponent(lastSyncAt)}`)
    if (!res.ok) return

    const data = await res.json() as SyncPullResponse
    if (!data?.synced_at) return

    // 4. Merge into local DB (last-write-wins on updated_at)
    mergePull(data)

    // 5. Persist
    await persistLocalDb()

    // 6. Save new watermark
    setLastSyncAt(data.synced_at)

    // 7. Notify stores
    window.dispatchEvent(new Event('sync-done'))

  } catch (err) {
    console.error('[sync] runSync failed:', err)
  } finally {
    syncing = false
  }
}

/** Run sync once, then re-run whenever the device comes back online. */
export function startSync(userId: string, partnerId: string | null): () => void {
  if (typeof window === 'undefined') return () => {}

  void runSync(userId, partnerId)

  const onOnline = () => void runSync(userId, partnerId)
  window.addEventListener('online', onOnline)
  return () => window.removeEventListener('online', onOnline)
}

// ── Push ──────────────────────────────────────────────────────────────────────

async function pushPending(lastSyncAt: string): Promise<void> {
  const pending = getPendingItems()

  // Build deltas from pending queue (todos, quests, habits, etc.)
  const deltas: Record<string, unknown>[] = []
  for (const { table, id } of pending) {
    const row = localDbGetById<Record<string, unknown>>(table, id)
    if (row) deltas.push({ table, ...row })
  }

  // Quest_tasks: sync by updated_at since they use a composite PK (no pending queue)
  const qtDeltas = localDbGetSince<Record<string, unknown>>('quest_tasks', lastSyncAt)
  for (const row of qtDeltas) {
    deltas.push({ table: 'quest_tasks', ...row })
  }

  if (deltas.length === 0) return

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deltas }),
  })

  if (res.ok) {
    // Clear successfully pushed items
    for (const { table, id } of pending) {
      clearPendingItem(table, id)
    }
  }
}

// ── Pull & merge ──────────────────────────────────────────────────────────────

interface SyncPullResponse {
  todos: Record<string, unknown>[]
  quests: Record<string, unknown>[]
  quest_tasks: Record<string, unknown>[]
  habits: Record<string, unknown>[]
  habit_tracking: Record<string, unknown>[]
  calendar_events: Record<string, unknown>[]
  users: Record<string, unknown>[]
  synced_at: string
}

function mergePull(data: SyncPullResponse): void {
  const tables: Array<[keyof SyncPullResponse, string]> = [
    ['todos',           'todos'],
    ['quests',          'quests'],
    ['habits',          'habits'],
    ['habit_tracking',  'habit_tracking'],
    ['calendar_events', 'calendar_events'],
    ['users',           'users'],
  ]

  for (const [key, table] of tables) {
    const rows = data[key] as Record<string, unknown>[]
    if (!rows?.length) continue
    for (const row of rows) {
      mergeRow(table, row)
    }
  }

  // quest_tasks: composite PK — use localDbGetQuestTask
  if (data.quest_tasks?.length) {
    for (const row of data.quest_tasks) {
      const existing = localDbGetQuestTask(row.quest_id as string, row.task_id as string)
      if (!existing || serverWins(row.updated_at as string, existing.updated_at)) {
        localDbUpsert('quest_tasks', row)
      }
    }
  }
}

/** Merge a single row: apply server data if server.updated_at >= local.updated_at. */
function mergeRow(table: string, serverRow: Record<string, unknown>): void {
  const id = serverRow.id as string
  if (!id) return
  const local = localDbGetById<{ updated_at?: string }>(table, id)
  if (!local || serverWins(serverRow.updated_at as string, local.updated_at)) {
    localDbUpsert(table, serverRow)
  }
}

/** Returns true if the server row should overwrite the local row. */
function serverWins(serverUpdatedAt: string | undefined, localUpdatedAt: string | undefined): boolean {
  if (!localUpdatedAt) return true   // no local version, take server's
  if (!serverUpdatedAt) return false // server has no timestamp, keep local
  return new Date(serverUpdatedAt) >= new Date(localUpdatedAt)
}
