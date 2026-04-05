// Server-only — not imported in client components
import type { createClient } from '@/lib/supabase/server'

type ServerClient = Awaited<ReturnType<typeof createClient>>

export interface NudgeContext {
  taskTitle: string
  taskDescription: string | null
  taskDueDate: string | null
  energyLevel: 'low' | 'medium' | 'high'
  parents: string[]                  // titles, immediate parent first
  quests: { name: string; icon: string; description: string | null }[]
  firstName: string
  customizationPrompt: string | null
}

export async function buildNudgeContext(
  supabase: ServerClient,
  taskId: string,
  userId: string
): Promise<NudgeContext | null> {
  const { data: task } = await supabase
    .from('todos')
    .select('id, title, description, due_date, parent_id, user_id, energy_level')
    .eq('id', taskId)
    .single()

  if (!task || task.user_id !== userId) return null

  // Walk parent chain upward
  const parents: string[] = []
  let currentParentId: string | null = task.parent_id
  while (currentParentId) {
    const { data: parent } = await supabase
      .from('todos')
      .select('id, title, parent_id')
      .eq('id', currentParentId)
      .single()
    if (!parent) break
    parents.push(parent.title)
    currentParentId = parent.parent_id
  }

  // Linked quests
  const { data: questLinks } = await supabase
    .from('quest_tasks')
    .select('quests(name, icon, description)')
    .eq('task_id', taskId)

  type QuestRow = { quests: { name: string; icon: string; description: string | null } | null }
  const quests = ((questLinks ?? []) as unknown as QuestRow[])
    .map(l => l.quests)
    .filter((q): q is { name: string; icon: string; description: string | null } => q !== null)

  // Owner user data
  const { data: dbUser } = await supabase
    .from('users')
    .select('display_name, customization_prompt')
    .eq('id', userId)
    .single()

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
