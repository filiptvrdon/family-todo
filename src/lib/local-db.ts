/**
 * Client-side SQLite store backed by IndexedDB for persistence.
 * Browser-only — never import this from server components or API routes.
 *
 * Core API:
 *   initLocalDb()                       — init once on app startup (idempotent)
 *   localDbGetAll<T>(table)             — all non-deleted rows, JS types restored
 *   localDbGetById<T>(table, id)        — single row by id (includes deleted)
 *   localDbGetSince<T>(table, since)    — all rows updated after timestamp (incl. deleted)
 *   localDbGetQuestTask(qId, tId)       — quest_tasks row by composite key
 *   localDbUpsert(table, row)           — insert or replace (preserves updated_at)
 *   localDbUpsertLocal(table, row)      — insert or replace + set updated_at=NOW() + mark pending
 *   localDbUpsertMany(table, rows)      — bulk upsert (for server data coming in)
 *   localDbSoftDelete(table, id)        — sets deleted_at + updated_at = NOW() + mark pending
 *   localDbSoftDeleteQuestTask(qId,tId) — soft-delete quest_tasks composite row
 *   localDbHardDelete(table, id)        — removes row + clears from pending queue
 *   persistLocalDb()                    — serialise DB to IndexedDB
 *   isOfflineError(err)                 — true if error is a network failure
 *
 * Pending queue (localStorage):
 *   markPending(table, id)              — add to pending-sync queue
 *   getPendingItems()                   — list of {table, id} to push next sync
 *   clearPendingItem(table, id)         — remove after successful server push
 */

import type { SqlJsStatic, Database } from 'sql.js'

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

const IDB_NAME = 'family-todo-local-db'
const IDB_STORE = 'db'
const IDB_KEY = 'snapshot'

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function loadFromIDB(): Promise<Uint8Array | null> {
  try {
    const idb = await openIDB()
    return new Promise((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function saveToIDB(data: Uint8Array): Promise<void> {
  try {
    const idb = await openIDB()
    return new Promise((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(data, IDB_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    // non-fatal
  }
}

// ── Schema ────────────────────────────────────────────────────────────────────

const SCHEMA = `
CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  priority TEXT,
  due_date TEXT,
  recurrence TEXT,
  scheduled_time TEXT,
  parent_id TEXT,
  "index" TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT,
  deleted_at TEXT,
  motivation_nudge TEXT,
  completion_nudge TEXT,
  energy_level TEXT NOT NULL DEFAULT 'medium',
  momentum_contribution INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT
);
CREATE TABLE IF NOT EXISTS quests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  pinned INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  deleted_at TEXT,
  momentum INTEGER NOT NULL DEFAULT 0,
  day_start_momentum INTEGER NOT NULL DEFAULT 0,
  last_momentum_increase TEXT,
  last_momentum_decay TEXT,
  last_momentum_nudge TEXT,
  motivation_nudge TEXT
);
CREATE TABLE IF NOT EXISTS quest_tasks (
  quest_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  updated_at TEXT,
  deleted_at TEXT,
  PRIMARY KEY (quest_id, task_id)
);
CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  value_type TEXT NOT NULL,
  unit_label TEXT,
  goal_value INTEGER,
  goal_period TEXT NOT NULL DEFAULT 'daily',
  "index" TEXT NOT NULL DEFAULT '',
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS habit_tracking (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  value INTEGER NOT NULL,
  logged_at TEXT NOT NULL,
  period_date TEXT NOT NULL,
  note TEXT,
  updated_at TEXT,
  deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  username TEXT,
  customization_prompt TEXT,
  avatar_url TEXT,
  partner_id TEXT,
  momentum INTEGER NOT NULL DEFAULT 0,
  day_start_momentum INTEGER NOT NULL DEFAULT 0,
  last_momentum_increase TEXT,
  last_momentum_decay TEXT,
  last_momentum_nudge TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);
`

// ── Type coercions ────────────────────────────────────────────────────────────

const BOOL_COLS: Record<string, string[]> = {
  todos: ['completed'],
  quests: ['pinned'],
  habits: ['is_archived'],
  calendar_events: ['all_day'],
  quest_tasks: [],
  habit_tracking: [],
  users: [],
}

// Fields that exist on the JS type but are not DB columns — strip before insert.
// Also includes server-only columns that shouldn't be stored in the local cache.
const EXCLUDE_COLS: Record<string, Set<string>> = {
  todos: new Set(['subtasks_count']),
  users: new Set(['avatar_data', 'google_refresh_token', 'avatar_mime', 'password_hash']),
}

function toSQLite(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const excluded = EXCLUDE_COLS[table]
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (excluded?.has(k)) continue
    out[k] = (BOOL_COLS[table] ?? []).includes(k) ? (v ? 1 : 0) : v
  }
  return out
}

function fromSQLite(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const out = { ...row }
  for (const col of BOOL_COLS[table] ?? []) {
    if (col in out) out[col] = out[col] === 1
  }
  return out
}

// ── Pending queue (localStorage) ──────────────────────────────────────────────
// Tracks which rows were written locally and need to be pushed to the server.
// quest_tasks are excluded (composite PK) — synced via localDbGetSince instead.

const PENDING_KEY = 'sync:pending'
const SYNCABLE = new Set(['todos', 'quests', 'habits', 'habit_tracking', 'calendar_events'])

export interface PendingItem { table: string; id: string }

export function markPending(table: string, id: string): void {
  if (typeof window === 'undefined' || !SYNCABLE.has(table)) return
  const items = getPendingItems()
  const key = `${table}:${id}`
  if (!items.some(i => `${i.table}:${i.id}` === key)) {
    items.push({ table, id })
    localStorage.setItem(PENDING_KEY, JSON.stringify(items))
  }
}

export function getPendingItems(): PendingItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as PendingItem[]
  } catch {
    return []
  }
}

export function clearPendingItem(table: string, id: string): void {
  if (typeof window === 'undefined') return
  const items = getPendingItems().filter(i => !(i.table === table && i.id === id))
  localStorage.setItem(PENDING_KEY, JSON.stringify(items))
}

// ── Singleton state ───────────────────────────────────────────────────────────

let db: Database | null = null
let initPromise: Promise<void> | null = null

// ── Public API ────────────────────────────────────────────────────────────────

export function initLocalDb(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (initPromise) return initPromise
  initPromise = _init()
  return initPromise
}

// Migrations for columns added after the initial schema — applied to existing DBs.
// SQLite doesn't support IF NOT EXISTS on ADD COLUMN, so we try/catch each one.
const MIGRATIONS: string[] = [
  `ALTER TABLE todos ADD COLUMN priority TEXT`,
]

async function _init(): Promise<void> {
  const initSqlJs = ((await import('sql.js')) as { default: (config?: object) => Promise<SqlJsStatic> }).default
  const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' })
  const saved = await loadFromIDB()
  db = saved ? new SQL.Database(saved) : new SQL.Database()
  db.run(SCHEMA)
  for (const migration of MIGRATIONS) {
    try { db.run(migration) } catch { /* column already exists */ }
  }
}

export function isLocalDbReady(): boolean {
  return db !== null
}

/** All non-deleted rows from a table, with JS types restored. */
export function localDbGetAll<T>(table: string): T[] {
  if (!db) return []
  const stmt = db.prepare(`SELECT * FROM "${table}" WHERE deleted_at IS NULL`)
  const rows: T[] = []
  while (stmt.step()) {
    rows.push(fromSQLite(table, stmt.getAsObject() as Record<string, unknown>) as T)
  }
  stmt.free()
  return rows
}

/** Single row by id (includes soft-deleted rows). */
export function localDbGetById<T>(table: string, id: string): T | null {
  if (!db) return null
  const stmt = db.prepare(`SELECT * FROM "${table}" WHERE id = ?`)
  stmt.bind([id])
  if (stmt.step()) {
    const row = fromSQLite(table, stmt.getAsObject() as Record<string, unknown>) as T
    stmt.free()
    return row
  }
  stmt.free()
  return null
}

/** All rows updated after `since` ISO timestamp, including soft-deleted ones.
 *  Used by the sync engine to find local changes to push, and to merge pulls. */
export function localDbGetSince<T>(table: string, since: string): T[] {
  if (!db) return []
  const stmt = db.prepare(`SELECT * FROM "${table}" WHERE updated_at > ?`)
  stmt.bind([since])
  const rows: T[] = []
  while (stmt.step()) {
    rows.push(fromSQLite(table, stmt.getAsObject() as Record<string, unknown>) as T)
  }
  stmt.free()
  return rows
}

/** quest_tasks row by composite primary key (includes soft-deleted). */
export function localDbGetQuestTask(questId: string, taskId: string): { updated_at?: string; deleted_at?: string | null } | null {
  if (!db) return null
  const stmt = db.prepare(`SELECT * FROM quest_tasks WHERE quest_id = ? AND task_id = ?`)
  stmt.bind([questId, taskId])
  if (stmt.step()) {
    const row = stmt.getAsObject()
    stmt.free()
    return row as { updated_at?: string; deleted_at?: string | null }
  }
  stmt.free()
  return null
}

/** Insert or replace a single row. Strips non-column fields. Does NOT mark pending. */
export function localDbUpsert(table: string, row: Record<string, unknown>): void {
  if (!db) return
  const converted = toSQLite(table, row)
  const cols = Object.keys(converted).filter(k => converted[k] !== undefined)
  if (cols.length === 0) return
  const placeholders = cols.map(() => '?').join(', ')
  const sql = `INSERT OR REPLACE INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`
  db.run(sql, cols.map(c => converted[c] as string | number | null))
}

/** Local write: upsert with updated_at = NOW() and mark row as pending sync. */
export function localDbUpsertLocal(table: string, row: Record<string, unknown>): void {
  localDbUpsert(table, { ...row, updated_at: new Date().toISOString() })
  if (row.id) markPending(table, row.id as string)
}

/** Bulk upsert (server data coming in — preserves server updated_at, not pending). */
export function localDbUpsertMany(table: string, rows: Record<string, unknown>[]): void {
  for (const row of rows) localDbUpsert(table, row)
}

/** Soft-delete: sets deleted_at + updated_at = NOW(), marks row as pending. */
export function localDbSoftDelete(table: string, id: string): void {
  if (!db) return
  const now = new Date().toISOString()
  db.run(`UPDATE "${table}" SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id])
  markPending(table, id)
}

/** Soft-delete for quest_tasks (composite PK). Not tracked in pending queue —
 *  synced via localDbGetSince on next push. */
export function localDbSoftDeleteQuestTask(questId: string, taskId: string): void {
  if (!db) return
  const now = new Date().toISOString()
  db.run(
    `UPDATE quest_tasks SET deleted_at = ?, updated_at = ? WHERE quest_id = ? AND task_id = ?`,
    [now, now, questId, taskId]
  )
}

/** Hard-delete: removes the row and clears it from the pending queue. */
export function localDbHardDelete(table: string, id: string): void {
  if (!db) return
  db.run(`DELETE FROM "${table}" WHERE id = ?`, [id])
  clearPendingItem(table, id)
}

/** Serialise and save the current DB to IndexedDB. */
export async function persistLocalDb(): Promise<void> {
  if (!db) return
  const data = db.export()
  await saveToIDB(data)
}

/** Returns true if the error is a network connectivity failure (device is offline). */
export function isOfflineError(err: unknown): boolean {
  return err instanceof TypeError
}
