import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import sql from '@/lib/db'

// ── Types ─────────────────────────────────────────────────────────────────────

type SyncableTable = 'todos' | 'quests' | 'quest_tasks' | 'habits' | 'habit_tracking' | 'calendar_events'

interface SyncDelta {
  table: SyncableTable
  [key: string]: unknown
}

// ── GET /api/sync?since=<ISO timestamp> ───────────────────────────────────────
// Returns all rows modified after `since` for the authenticated user + partner.
// Includes soft-deleted rows so clients learn about deletions.

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const since = req.nextUrl.searchParams.get('since') ?? new Date(0).toISOString()

  const [profile] = await sql<{ partner_id: string | null }[]>`
    SELECT partner_id FROM users WHERE id = ${user.id}
  `
  const partnerId = profile?.partner_id ?? null
  const syncedAt = new Date().toISOString()

  const [todos, quests, questTasks, habits, habitTracking, calendarEvents, users] = await Promise.all([
    partnerId
      ? sql`SELECT * FROM todos WHERE (user_id = ${user.id} OR user_id = ${partnerId}) AND updated_at > ${since}`
      : sql`SELECT * FROM todos WHERE user_id = ${user.id} AND updated_at > ${since}`,

    sql`SELECT * FROM quests WHERE user_id = ${user.id} AND updated_at > ${since}`,

    sql`
      SELECT qt.* FROM quest_tasks qt
      JOIN quests q ON q.id = qt.quest_id
      WHERE q.user_id = ${user.id} AND qt.updated_at > ${since}
    `,

    sql`SELECT * FROM habits WHERE user_id = ${user.id} AND updated_at > ${since}`,

    sql`SELECT * FROM habit_tracking WHERE user_id = ${user.id} AND updated_at > ${since}`,

    partnerId
      ? sql`SELECT * FROM calendar_events WHERE (user_id = ${user.id} OR user_id = ${partnerId}) AND updated_at > ${since}`
      : sql`SELECT * FROM calendar_events WHERE user_id = ${user.id} AND updated_at > ${since}`,

    partnerId
      ? sql`
          SELECT id, email, display_name, username, customization_prompt, avatar_url, partner_id,
                 momentum, day_start_momentum, last_momentum_increase, last_momentum_decay,
                 last_momentum_nudge, created_at, updated_at, deleted_at
          FROM users
          WHERE (id = ${user.id} OR id = ${partnerId}) AND updated_at > ${since}
        `
      : sql`
          SELECT id, email, display_name, username, customization_prompt, avatar_url, partner_id,
                 momentum, day_start_momentum, last_momentum_increase, last_momentum_decay,
                 last_momentum_nudge, created_at, updated_at, deleted_at
          FROM users
          WHERE id = ${user.id} AND updated_at > ${since}
        `,
  ])

  return NextResponse.json({
    todos,
    quests,
    quest_tasks: questTasks,
    habits,
    habit_tracking: habitTracking,
    calendar_events: calendarEvents,
    users,
    synced_at: syncedAt,
  })
}

// ── POST /api/sync ────────────────────────────────────────────────────────────
// Accepts client deltas and applies them using last-write-wins on updated_at.
// Each delta must include the target `table` field.

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { deltas: SyncDelta[] }
  if (!Array.isArray(body?.deltas)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const errors: string[] = []

  for (const delta of body.deltas) {
    try {
      await applyDelta(user.id, delta)
    } catch (err) {
      console.error('[sync] failed to apply delta:', delta.table, err)
      errors.push(`${delta.table}:${String(delta.id ?? delta.quest_id)}`)
    }
  }

  return NextResponse.json({ ok: true, errors })
}

// ── Delta application helpers ─────────────────────────────────────────────────

async function applyDelta(userId: string, delta: SyncDelta): Promise<void> {
  switch (delta.table) {
    case 'todos':         return applyRowDelta(userId, 'todos', delta)
    case 'quests':        return applyRowDelta(userId, 'quests', delta)
    case 'habits':        return applyRowDelta(userId, 'habits', delta)
    case 'habit_tracking':return applyRowDelta(userId, 'habit_tracking', delta)
    case 'calendar_events':return applyRowDelta(userId, 'calendar_events', delta)
    case 'quest_tasks':   return applyQuestTaskDelta(userId, delta)
  }
}

/** Applies a delta for tables with a single `id` primary key. */
async function applyRowDelta(userId: string, table: SyncableTable, delta: SyncDelta): Promise<void> {
  const { table: _table, ...row } = delta
  void _table
  if (row.user_id !== userId) return  // reject cross-user writes

  const id = row.id as string
  const clientUpdatedAt = row.updated_at as string | undefined
  if (!id || !clientUpdatedAt) return

  const [existing] = await getExistingUpdatedAt(table, id)

  if (serverIsNewer(existing?.updated_at, clientUpdatedAt)) return  // skip, server wins

  const { id: _id, user_id: _uid, created_at: _ca, ...fields } = row as Record<string, unknown>
  void _id; void _uid; void _ca

  if (!existing) {
    await insertRow(table, { id, user_id: userId, ...fields })
  } else {
    await updateRow(table, id, fields)
  }
}

/** Applies a delta for quest_tasks (composite PK). */
async function applyQuestTaskDelta(userId: string, delta: SyncDelta): Promise<void> {
  const { table: _table, ...row } = delta
  void _table
  const questId = row.quest_id as string
  const taskId = row.task_id as string
  const clientUpdatedAt = row.updated_at as string | undefined
  if (!questId || !taskId || !clientUpdatedAt) return

  // Verify the quest belongs to the authenticated user
  const [quest] = await sql<{ id: string }[]>`
    SELECT id FROM quests WHERE id = ${questId} AND user_id = ${userId}
  `
  if (!quest) return

  const [existing] = await sql<{ updated_at: string | null }[]>`
    SELECT updated_at FROM quest_tasks WHERE quest_id = ${questId} AND task_id = ${taskId}
  `

  if (serverIsNewer(existing?.updated_at, clientUpdatedAt)) return

  const deletedAt = (row.deleted_at as string | null) ?? null

  if (!existing) {
    await sql`
      INSERT INTO quest_tasks (quest_id, task_id, updated_at, deleted_at)
      VALUES (${questId}, ${taskId}, ${clientUpdatedAt}, ${deletedAt})
    `
  } else {
    await sql`
      UPDATE quest_tasks SET updated_at = ${clientUpdatedAt}, deleted_at = ${deletedAt}
      WHERE quest_id = ${questId} AND task_id = ${taskId}
    `
  }
}

// ── SQL helpers ───────────────────────────────────────────────────────────────

async function getExistingUpdatedAt(table: SyncableTable, id: string): Promise<{ updated_at: string | null }[]> {
  switch (table) {
    case 'todos':          return sql<{ updated_at: string | null }[]>`SELECT updated_at FROM todos WHERE id = ${id}`
    case 'quests':         return sql<{ updated_at: string | null }[]>`SELECT updated_at FROM quests WHERE id = ${id}`
    case 'habits':         return sql<{ updated_at: string | null }[]>`SELECT updated_at FROM habits WHERE id = ${id}`
    case 'habit_tracking': return sql<{ updated_at: string | null }[]>`SELECT updated_at FROM habit_tracking WHERE id = ${id}`
    case 'calendar_events':return sql<{ updated_at: string | null }[]>`SELECT updated_at FROM calendar_events WHERE id = ${id}`
    default: return []
  }
}

async function insertRow(table: SyncableTable, row: Record<string, unknown>): Promise<void> {
  switch (table) {
    case 'todos':          return void await sql`INSERT INTO todos ${sql(row)}`
    case 'quests':         return void await sql`INSERT INTO quests ${sql(row)}`
    case 'habits':         return void await sql`INSERT INTO habits ${sql(row)}`
    case 'habit_tracking': return void await sql`INSERT INTO habit_tracking ${sql(row)}`
    case 'calendar_events':return void await sql`INSERT INTO calendar_events ${sql(row)}`
  }
}

async function updateRow(table: SyncableTable, id: string, fields: Record<string, unknown>): Promise<void> {
  // Only update if fields is non-empty
  if (Object.keys(fields).length === 0) return
  switch (table) {
    case 'todos':          return void await sql`UPDATE todos SET ${sql(fields)} WHERE id = ${id}`
    case 'quests':         return void await sql`UPDATE quests SET ${sql(fields)} WHERE id = ${id}`
    case 'habits':         return void await sql`UPDATE habits SET ${sql(fields)} WHERE id = ${id}`
    case 'habit_tracking': return void await sql`UPDATE habit_tracking SET ${sql(fields)} WHERE id = ${id}`
    case 'calendar_events':return void await sql`UPDATE calendar_events SET ${sql(fields)} WHERE id = ${id}`
  }
}

/** Returns true if the server's version is strictly newer than the client's — skip the delta. */
function serverIsNewer(serverUpdatedAt: string | null | undefined, clientUpdatedAt: string): boolean {
  if (!serverUpdatedAt) return false
  return new Date(serverUpdatedAt) > new Date(clientUpdatedAt)
}
