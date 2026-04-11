// Server-only — not imported in client components
import sql from '@/lib/db'

export interface NudgeContext {
  taskTitle: string
  taskDescription: string | null
  taskDueDate: string | null
  energyLevel: 'low' | 'medium' | 'high'
  parents: string[]
  quests: { name: string; icon: string; description: string | null }[]
  firstName: string
  customizationPrompt: string | null
}

export async function buildNudgeContext(
  taskId: string,
  userId: string
): Promise<NudgeContext | null> {
  const [task] = await sql<{
    id: string; title: string; description: string | null; due_date: string | null;
    parent_id: string | null; user_id: string; energy_level: string
  }[]>`
    SELECT id, title, description, due_date, parent_id, user_id, energy_level
    FROM todos WHERE id = ${taskId}
  `

  if (!task || task.user_id !== userId) return null

  // Walk parent chain upward
  const parents: string[] = []
  let currentParentId: string | null = task.parent_id
  while (currentParentId) {
    const [parent] = await sql<{ id: string; title: string; parent_id: string | null }[]>`
      SELECT id, title, parent_id FROM todos WHERE id = ${currentParentId}
    `
    if (!parent) break
    parents.push(parent.title)
    currentParentId = parent.parent_id
  }

  // Linked quests
  const quests = await sql<{ name: string; icon: string; description: string | null }[]>`
    SELECT q.name, q.icon, q.description
    FROM quest_tasks qt
    JOIN quests q ON q.id = qt.quest_id
    WHERE qt.task_id = ${taskId}
  `

  const [dbUser] = await sql<{ display_name: string; customization_prompt: string | null }[]>`
    SELECT display_name, customization_prompt FROM users WHERE id = ${userId}
  `

  return {
    taskTitle: task.title,
    taskDescription: task.description,
    taskDueDate: task.due_date,
    energyLevel: (task.energy_level as 'low' | 'medium' | 'high') || 'low',
    parents,
    quests,
    firstName: (dbUser?.display_name ?? '').split(' ')[0] || 'there',
    customizationPrompt: dbUser?.customization_prompt ?? null,
  }
}

export function buildContextString(ctx: NudgeContext): string {
  let str = `Task: "${ctx.taskTitle}"`
  if (ctx.taskDescription) str += `\nDescription: ${ctx.taskDescription}`
  if (ctx.taskDueDate) str += `\nDue: ${ctx.taskDueDate}`
  str += `\nEnergy required: ${ctx.energyLevel}`
  if (ctx.parents.length > 0) {
    str += `\nParent task chain: ${ctx.parents.map(t => `"${t}"`).join(' → ')}`
  }
  if (ctx.quests.length > 0) {
    str += `\nLinked quests: ${ctx.quests.map(q =>
      `${q.icon} ${q.name}${q.description ? ` (${q.description})` : ''}`
    ).join(', ')}`
  }
  if (ctx.customizationPrompt) {
    str += `\nAbout the user: ${ctx.customizationPrompt}`
  }
  return str
}
