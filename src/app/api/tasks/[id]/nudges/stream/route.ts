import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiStream, AIMessage } from '@/lib/ai'
import { buildNudgeContext, buildContextString } from '../../_context'

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
      content: `You are a warm, supportive companion for ${ctx.firstName}. Write a short, warm nudge (1–2 sentences) explaining how completing this task helps ${ctx.firstName} move forward. Reference the parent task if there is one, and the quest(s) if linked. Address ${ctx.firstName} by first name. Never use the word "productivity". Tone: encouraging, personal, never generic. Return only the nudge text, nothing else.`,
    },
    { role: 'user', content: buildContextString(ctx) },
  ]

  try {
    const stream = await aiStream(messages)
    const [clientStream, dbStream] = stream.tee()

    // Persist when stream ends
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
          await supabase.from('todos').update({ motivation_nudge: text }).eq('id', taskId)
        }
      } catch (e) {
        console.error('[nudges/stream] failed to persist motivation nudge:', e)
      }
    })()

    return new Response(clientStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (e) {
    console.error('[nudges/stream] failed to generate motivation nudge:', e)
    return new Response('', { status: 200 })
  }
}
