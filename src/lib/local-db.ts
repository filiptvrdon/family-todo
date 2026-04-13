/**
 * Client-side SQLite store backed by IndexedDB for persistence.
 * Browser-only — never import this from server components or API routes.
 *
 * Usage:
 *   await initLocalDb()          — call once on app startup (safe to call multiple times)
 *   localDbGetAll<T>('todos')    — returns all non-deleted rows, coercing types
 *   localDbUpsert('todos', row)  — insert or replace a single row
 *   localDbUpsertMany('todos', rows) — bulk upsert
 *   localDbSoftDelete('todos', id)   — sets deleted_at = now
 *   localDbHardDelete('todos', id)   — removes row entirely (for discarding temp items)
 *   await persistLocalDb()       — serialises DB to IndexedDB
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
// SQLite stores booleans as 0/1 integers. These maps define which columns
// need JS boolean ↔ SQLite integer coercion per table.

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
const EXCLUDE_COLS: Record<string, Set<string>> = {
  todos: new Set(['subtasks_count']),
  users: new Set(['avatar_data', 'google_refresh_token']),
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

// ── Singleton state ───────────────────────────────────────────────────────────

let db: Database | null = null
let initPromise: Promise<void> | null = null

// ── Public API ────────────────────────────────────────────────────────────────

/** Initialise the local SQLite DB. Safe to call multiple times — initialises once. */
export function initLocalDb(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (initPromise) return initPromise
  initPromise = _init()
  return initPromise
}

async function _init(): Promise<void> {
  const initSqlJs = ((await import('sql.js')) as { default: (config?: object) => Promise<SqlJsStatic> }).default
  const SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' })
  const saved = await loadFromIDB()
  db = saved ? new SQL.Database(saved) : new SQL.Database()
  db.run(SCHEMA)
}

export function isLocalDbReady(): boolean {
  return db !== null
}

/** Returns all non-deleted rows from a table, with JS types restored. */
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

/** Insert or replace a single row. Strips non-column fields automatically. */
export function localDbUpsert(table: string, row: Record<string, unknown>): void {
  if (!db) return
  const converted = toSQLite(table, row)
  const cols = Object.keys(converted).filter(k => converted[k] !== undefined)
  if (cols.length === 0) return
  const placeholders = cols.map(() => '?').join(', ')
  const sql = `INSERT OR REPLACE INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`
  db.run(sql, cols.map(c => converted[c] as string | number | null))
}

/** Bulk upsert — calls localDbUpsert for each row. */
export function localDbUpsertMany(table: string, rows: Record<string, unknown>[]): void {
  for (const row of rows) localDbUpsert(table, row)
}

/** Soft-delete: sets deleted_at = now. Used for normal deletes. */
export function localDbSoftDelete(table: string, id: string): void {
  if (!db) return
  db.run(`UPDATE "${table}" SET deleted_at = ? WHERE id = ?`, [new Date().toISOString(), id])
}

/** Hard-delete: removes the row entirely. Used to discard temp-ID rows on server error. */
export function localDbHardDelete(table: string, id: string): void {
  if (!db) return
  db.run(`DELETE FROM "${table}" WHERE id = ?`, [id])
}

/** Serialise and save the current DB to IndexedDB. Call after writes. */
export async function persistLocalDb(): Promise<void> {
  if (!db) return
  const data = db.export()
  await saveToIDB(data)
}

/** Returns true if the error is a network connectivity failure (device is offline). */
export function isOfflineError(err: unknown): boolean {
  return err instanceof TypeError
}
