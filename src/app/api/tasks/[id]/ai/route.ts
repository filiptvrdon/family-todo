import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import { aiText, AIMessage } from '@/lib/ai'
import { buildNudgeContext, buildContextString } from '../_context'
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

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are a warm, supportive companion for ${ctx.firstName}. Write a short celebratory message (1–2 sentences) for ${ctx.firstName} who just completed this task. Highlight how it connects to the parent task (if any) and the quest(s) (if linked). Tone: warm, specific, celebratory — never hollow or generic (not "Great job!"). Always respond in English. Return only the message text, nothing else.`,
    },
    { role: 'user', content: buildContextString(ctx) },
  ]

  try {
    const text = await aiText(messages)
    if (text) {
      await sql`UPDATE todos SET completion_nudge = ${text} WHERE id = ${taskId}`
    }
  } catch (e) {
    console.error('[ai] failed to generate completion nudge:', e)
  }

  return new Response('', { status: 200 })
}
