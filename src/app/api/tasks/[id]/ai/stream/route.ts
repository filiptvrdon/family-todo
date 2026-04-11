import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import { aiStream, AIMessage } from '@/lib/ai'
import { buildNudgeContext, buildContextString } from '../../_context'
import sql from '@/lib/db'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { id: taskId } = await params

  const ctx = await buildNudgeContext(taskId, user.id)
  if (!ctx) return new Response('', { status: 200 })

  const baseMomentum = ctx.energyLevel === 'low' ? 10 : ctx.energyLevel === 'medium' ? 20 : 30

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are a supportive companion for ${ctx.firstName}. Write a short, 1 sentence, nudge explaining how completing this task helps ${ctx.firstName} move forward. Reference the parent task if there is one, and the quest(s) if linked. Tone: encouraging, personal, never generic. Always respond in English.`,
    },
    { role: 'user', content: buildContextString(ctx) },
  ]

  try {
    const stream = await aiStream(messages)
    const [clientStream, dbStream] = stream.tee()

    ;(async () => {
      try {
        const reader = dbStream.getReader()
        const decoder = new TextDecoder()
        let text = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          text += decoder.decode(value, { stream: true })
        }
        if (text) {
          const bonusMatch = text.match(/\[BONUS:\s*(\d+)\]/)
          const bonus = bonusMatch ? parseInt(bonusMatch[1]) : 0
          const nudgeText = text.replace(/\[BONUS:\s*\d+\]/g, '').trim()
          await sql`
            UPDATE todos
            SET motivation_nudge = ${nudgeText}, momentum_contribution = ${baseMomentum + bonus}
            WHERE id = ${taskId}
          `
        }
      } catch (e) {
        console.error('[ai/stream] failed to persist metadata:', e)
      }
    })()

    return new Response(clientStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (e) {
    console.error('[ai/stream] failed to generate metadata:', e)
    return new Response('', { status: 200 })
  }
}
