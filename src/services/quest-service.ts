import sql from '@/lib/db'
import { Quest } from '@/lib/types'

export async function fetchQuests(userId: string): Promise<Quest[]> {
  return sql<Quest[]>`
    SELECT * FROM quests
    WHERE user_id = ${userId}
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
  const { id: _, created_at, ...data } = patch as Record<string, unknown>
  void id; void created_at
  const filtered = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  const [row] = await sql<Quest[]>`UPDATE quests SET ${sql(filtered)} WHERE id = ${id} RETURNING *`
  return row
}

export async function deleteQuest(id: string): Promise<void> {
  await sql`DELETE FROM quests WHERE id = ${id}`
}

export async function fetchLinkedTasks(questId: string): Promise<{ id: string; title: string; completed: boolean }[]> {
  return sql<{ id: string; title: string; completed: boolean }[]>`
    SELECT t.id, t.title, t.completed
    FROM quest_tasks qt
    JOIN todos t ON t.id = qt.task_id
    WHERE qt.quest_id = ${questId}
  `
}

export async function fetchQuestsForTask(taskId: string): Promise<string[]> {
  const rows = await sql<{ quest_id: string }[]>`
    SELECT quest_id FROM quest_tasks WHERE task_id = ${taskId}
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
    ON CONFLICT (quest_id, task_id) DO NOTHING
  `
}

export async function unlinkTask(questId: string, taskId: string): Promise<void> {
  await sql`DELETE FROM quest_tasks WHERE quest_id = ${questId} AND task_id = ${taskId}`
}
