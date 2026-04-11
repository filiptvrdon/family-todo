import sql from '@/lib/db'
import { aiText, AIMessage } from '@/lib/ai'

export async function maintainMomentum(userId: string) {
  // 1. Run global decay (has a 23h gate per user/quest — safe to call freely)
  await sql`SELECT process_daily_momentum()`

  // 2. Check for quests nearing decay (>12h inactivity) and generate nudges
  const quests = await sql<{
    id: string
    name: string
    momentum: number
    last_momentum_increase: string
    last_momentum_nudge: string | null
    motivation_nudge: string | null
  }[]>`
    SELECT id, name, momentum, last_momentum_increase, last_momentum_nudge, motivation_nudge
    FROM quests
    WHERE user_id = ${userId} AND status = 'active'
  `

  const now = Date.now()

  for (const quest of quests) {
    const hoursSinceIncrease = (now - new Date(quest.last_momentum_increase).getTime()) / 3_600_000
    const nudgeNeeded =
      hoursSinceIncrease > 12 &&
      (!quest.last_momentum_nudge ||
        (now - new Date(quest.last_momentum_nudge).getTime()) / 3_600_000 > 12)

    if (nudgeNeeded) {
      // Pick a low-energy incomplete task linked to this quest
      const [task] = await sql<{ id: string; title: string; energy_level: string }[]>`
        SELECT t.id, t.title, t.energy_level
        FROM quest_tasks qt
        JOIN todos t ON t.id = qt.task_id
        WHERE qt.quest_id = ${quest.id}
          AND t.completed = false
          AND t.energy_level = 'low'
        LIMIT 1
      `

      if (task) {
        const messages: AIMessage[] = [
          {
            role: 'system',
            content: `You are a warm, supportive companion. This user's quest "${quest.name}" is about to lose momentum due to inactivity. Suggest they take one small step: "${task.title}". Keep it to 1 sentence, very warm, and mention the quest by name. Tone: encouraging, never guilt-tripping.`,
          },
          { role: 'user', content: `Quest: ${quest.name}. Task to suggest: ${task.title}` },
        ]

        try {
          const nudge = await aiText(messages)
          if (nudge) {
            await sql`
              UPDATE quests
              SET motivation_nudge = ${nudge}, last_momentum_nudge = now()
              WHERE id = ${quest.id}
            `
          }
        } catch (e) {
          console.error('[momentum] nudge generation failed', e)
        }
      }
    } else if (hoursSinceIncrease < 6 && quest.motivation_nudge) {
      // Clear old nudge if user has been active recently
      await sql`UPDATE quests SET motivation_nudge = null WHERE id = ${quest.id}`
    }
  }
}
