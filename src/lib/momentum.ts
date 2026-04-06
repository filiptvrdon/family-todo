import { createClient } from '@/lib/supabase/server'
import { aiText, AIMessage } from '@/lib/ai'

export async function maintainMomentum(userId: string) {
  const supabase = await createClient()

  // 1. Run the global decay logic (safe to run multiple times, as it has a 23h gate per user/quest)
  await supabase.rpc('process_daily_momentum')

  // 2. Check for quests nearing decay (>12h inactivity) and generate nudges if needed
  const { data: quests } = await supabase
    .from('quests')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (!quests) return

  for (const quest of quests) {
    const lastIncrease = new Date(quest.last_momentum_increase).getTime()
    const now = new Date().getTime()
    const hoursSinceIncrease = (now - lastIncrease) / (1000 * 60 * 60)

    // If inactivity > 12h AND (no nudge yet OR nudge was > 12h ago)
    const nudgeNeeded = hoursSinceIncrease > 12 && (!quest.last_momentum_nudge || (now - new Date(quest.last_momentum_nudge).getTime()) / (1000 * 60 * 60) > 12)

    if (nudgeNeeded) {
      // Pick a low-energy task from this quest to suggest
      const { data: tasks } = await supabase
        .from('quest_tasks')
        .select('todos(id, title, energy_level)')
        .eq('quest_id', quest.id)
        .eq('todos.completed', false)
        .eq('todos.energy_level', 'low')
        .limit(1)

      type TodoRow = { todos: { id: string; title: string; energy_level: string } | null }
      const task = (tasks as unknown as TodoRow[])?.[0]?.todos

      if (task) {
        // Generate a nudge
        const messages: AIMessage[] = [
          {
            role: 'system',
            content: `You are a warm, supportive companion. This user's quest "${quest.name}" is about to lose momentum due to inactivity. Suggest they take one small step: "${task.title}". Keep it to 1 sentence, very warm, and mention the quest by name. Tone: encouraging, never guilt-tripping.`
          },
          { role: 'user', content: `Quest: ${quest.name}. Task to suggest: ${task.title}` }
        ]

        try {
          const nudge = await aiText(messages)
          if (nudge) {
            await supabase.from('quests').update({
              motivation_nudge: nudge,
              last_momentum_nudge: new Date().toISOString()
            }).eq('id', quest.id)
          }
        } catch (e) {
          console.error('[momentum] nudge generation failed', e)
        }
      }
    } else if (hoursSinceIncrease < 6) {
      // Clear old nudge if they've been active recently
      if (quest.motivation_nudge) {
        await supabase.from('quests').update({
          motivation_nudge: null
        }).eq('id', quest.id)
      }
    }
  }
}
