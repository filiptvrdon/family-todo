import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiText, AIMessage } from '@/lib/ai'
import { buildNudgeContext, buildContextString } from '../_context'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { id: taskId } = await params

  const ctx = await buildNudgeContext(supabase, taskId, user.id)
  if (!ctx) return new Response('', { status: 200 })

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are a warm, supportive companion for ${ctx.firstName}. Write a short celebratory message (1–2 sentences) for ${ctx.firstName} who just completed this task. Highlight how it connects to the parent task (if any) and the quest(s) (if linked). Address ${ctx.firstName} by first name. Tone: warm, specific, celebratory — never hollow or generic (not "Great job!"). Return only the message text, nothing else.`,
    },
    { role: 'user', content: buildContextString(ctx) },
  ]

  try {
    const text = await aiText(messages)
    if (text) {
      await supabase.from('todos').update({ completion_nudge: text }).eq('id', taskId)
    }
  } catch (e) {
    console.error('[ai] failed to generate completion nudge:', e)
  }

  return new Response('', { status: 200 })
}
