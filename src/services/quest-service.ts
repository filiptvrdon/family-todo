import sql from '@/lib/db'
import { Quest } from '@/lib/types'

export async function fetchQuests(userId: string): Promise<Quest[]> {
  return sql<Quest[]>`
    SELECT * FROM quests
    WHERE user_id = ${userId}
      AND deleted_at IS NULL
    ORDER BY pinned DESC, created_at DESC
  `
}

export async function createQuest(
  quest: Omit<Quest, 'id' | 'created_at' | 'momentum' | 'day_start_momentum' | 'last_momentum_increase' | 'last_momentum_decay' | 'last_momentum_nudge' | 'motivation_nudge'>
): Promise<Quest> {
  const [row] = await sql<Quest[]>`INSERT INTO quests ${sql(quest as Record<string, unknown>)} RETURNING *`
  return row
}

export async function updateQuest(id: string, patch: Partial<Quest>): Promise<Quest> {
  const { id: _id, created_at, ...data } = patch as Record<string, unknown>
  void _id; void created_at
  const filtered = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  const [row] = await sql<Quest[]>`UPDATE quests SET ${sql(filtered)} WHERE id = ${id} RETURNING *`
  return row
}

export async function deleteQuest(id: string): Promise<void> {
  await sql`UPDATE quests SET deleted_at = NOW() WHERE id = ${id}`
}

export async function fetchLinkedTasks(questId: string): Promise<{ id: string; title: string; completed: boolean; energy_level: string; completed_at: string | null }[]> {
  return sql<{ id: string; title: string; completed: boolean; energy_level: string; completed_at: string | null }[]>`
    SELECT t.id, t.title, t.completed, t.energy_level, t.completed_at
    FROM quest_tasks qt
    JOIN todos t ON t.id = qt.task_id
    WHERE qt.quest_id = ${questId}
      AND qt.deleted_at IS NULL
      AND t.deleted_at IS NULL
  `
}

export async function fetchQuestsForTask(taskId: string): Promise<string[]> {
  const rows = await sql<{ quest_id: string }[]>`
    SELECT quest_id FROM quest_tasks
    WHERE task_id = ${taskId}
      AND deleted_at IS NULL
  `
  return rows.map(r => r.quest_id)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function fetchQuestLinksForTasks(
  taskIds: string[]
): Promise<Record<string, { icon: string; name: string; status: string }[]>> {
  const validIds = taskIds.filter(id => UUID_RE.test(id))
  if (!validIds.length) return {}
  const rows = await sql<{ task_id: string; icon: string; name: string; status: string }[]>`
    SELECT qt.task_id, q.icon, q.name, q.status
    FROM quest_tasks qt
    JOIN quests q ON q.id = qt.quest_id
    WHERE qt.task_id = ANY(${validIds}::uuid[])
      AND qt.deleted_at IS NULL
      AND q.deleted_at IS NULL
  `
  const map: Record<string, { icon: string; name: string; status: string }[]> = {}
  for (const row of rows) {
    if (!map[row.task_id]) map[row.task_id] = []
    map[row.task_id].push({ icon: row.icon, name: row.name, status: row.status })
  }
  return map
}

export async function linkTask(questId: string, taskId: string): Promise<void> {
  await sql`
    INSERT INTO quest_tasks (quest_id, task_id) VALUES (${questId}, ${taskId})
    ON CONFLICT (quest_id, task_id) DO UPDATE SET deleted_at = NULL
  `
}

export async function unlinkTask(questId: string, taskId: string): Promise<void> {
  await sql`UPDATE quest_tasks SET deleted_at = NOW() WHERE quest_id = ${questId} AND task_id = ${taskId}`
}
