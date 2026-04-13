import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import { format, addDays } from 'date-fns'
import { aiJSON, aiStream, AIMessage } from '@/lib/ai'
import { maintainMomentum } from '@/lib/momentum'
import sql from '@/lib/db'

type Message = { role: 'user' | 'assistant'; content: string }
type OverdueTodo = { id: string; title: string; due_date: string }
type PendingTodo = { title: string; due_date: string | null }

function formatTodoList(todos: PendingTodo[], today: string): string {
  if (todos.length === 0) return 'none'
  return todos
    .map((t) => {
      if (!t.due_date) return `- "${t.title}"`
      const overdue = t.due_date < today ? ` (overdue since ${t.due_date})` : ` (due ${t.due_date})`
      return `- "${t.title}"${overdue}`
    })
    .join('\n')
}

function buildChatSystem(
  userName: string,
  overdueTodos: OverdueTodo[],
  pendingTodos: PendingTodo[],
  isFirstUserMessage: boolean,
  today: string,
): string {
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  let sys = `You are a warm, supportive daily planning companion for ${userName}.
Today is ${today} (${timeOfDay}).
Keep ALL responses to 2–3 sentences maximum. Never use bullet points or lists.
Warm, casual tone — never clinical or formal.

${userName}'s current pending tasks:
${formatTodoList(pendingTodos, today)}`

  if (isFirstUserMessage) {
    if (overdueTodos.length > 0) {
      const sample = overdueTodos
        .slice(0, 2)
        .map((t) => `"${t.title}"`)
        .join(' and ')
      sys += `\n\nAfter warmly acknowledging what the user shared, naturally mention ${sample} — ask if ${overdueTodos.length === 1 ? "it's" : "they're"} still on the list. Weave it in naturally, don't make it feel like a list.`
    } else {
      sys += `\n\nAcknowledge what the user shared warmly, let them know you've sorted it all out, and wish them a good ${timeOfDay}. Keep it brief and warm.`
    }
  }

  return sys
}

async function extractTasks(brainDump: string, today: string) {
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd')
  try {
    const raw = await aiJSON([
      {
        role: 'system',
        content: `Extract tasks from the user's text. Return ONLY a JSON array.
Schema: [{"title":"string","due_date":"YYYY-MM-DD or null","recurrence":"daily|weekly|monthly or null"}]
Today: ${today}. Tomorrow: ${tomorrow}. Next week: ${nextWeek}.
Parse relative dates. Extract every action item or obligation. Return [] if nothing found.`,
      },
      { role: 'user', content: brainDump },
    ])
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function extractOverdueDecisions(messages: Message[], overdueTodos: OverdueTodo[]) {
  if (overdueTodos.length === 0) return []
  const conversationText = messages
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n')
  try {
    const raw = await aiJSON([
      {
        role: 'system',
        content: `Analyze this conversation. Which overdue tasks did the user say are done, completed, or no longer needed?
Tasks: ${JSON.stringify(overdueTodos.map((t) => ({ id: t.id, title: t.title })))}
Return ONLY JSON: {"delete_ids": ["id1"]}
Only include IDs where the user clearly said the task is done or no longer needed. When in doubt, omit.`,
      },
      { role: 'user', content: conversationText },
    ])
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed.delete_ids) ? (parsed.delete_ids as string[]) : []
  } catch {
    return []
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body
  const today = format(new Date(), 'yyyy-MM-dd')

  // ── Greeting (streaming) ─────────────────────────────────────────────────────
  if (action === 'greet') {
    const { userName, pendingTodos = [] } = body as { userName: string; pendingTodos: PendingTodo[] }
    const hour = new Date().getHours()
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
    const hasTodos = pendingTodos.length > 0
    const stream = await aiStream([
      {
        role: 'system',
        content: `You are a warm daily planning companion for ${userName}.
Today is ${today} (${timeOfDay}).
${hasTodos ? `${userName}'s current pending tasks:\n${formatTodoList(pendingTodos, today)}\n` : ''}
Generate a brief ${timeOfDay} greeting. Their tasks and schedule are already displayed — don't list or summarize them.
Ask what else is on their mind — new tasks, thoughts, plans, anything.
1–2 sentences max, warm and casual. Don't say "How can I help you today?". Be personal and inviting.`,
      },
      { role: 'user', content: 'start' },
    ])
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  // ── Chat turn (streaming + background task extraction) ───────────────────────
  if (action === 'chat') {
    const { messages, userName, overdueTodos, pendingTodos = [], isFirstUserMessage } = body as {
      messages: Message[]
      userName: string
      overdueTodos: OverdueTodo[]
      pendingTodos: PendingTodo[]
      isFirstUserMessage: boolean
    }

    const systemPrompt = buildChatSystem(userName, overdueTodos, pendingTodos, isFirstUserMessage, today)
    const history: AIMessage[] =
      messages[0]?.role === 'assistant'
        ? [{ role: 'user', content: '.' }, ...messages]
        : messages

    if (isFirstUserMessage) {
      const brainDump = messages[messages.length - 1]?.content ?? ''
      extractTasks(brainDump, today).then(async (tasks) => {
        if (tasks.length === 0) return
        for (const t of tasks as { title: string; due_date: string | null; recurrence: string | null }[]) {
          await sql`
            INSERT INTO todos (user_id, title, due_date, recurrence)
            VALUES (
              ${user.id},
              ${t.title},
              ${t.due_date ?? today},
              ${(['daily', 'weekly', 'monthly'] as const).includes(t.recurrence as 'daily' | 'weekly' | 'monthly') ? t.recurrence : null}
            )
          `
        }
      })
    }

    const stream = await aiStream([{ role: 'system', content: systemPrompt }, ...history])
    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  // ── Finalize ─────────────────────────────────────────────────────────────────
  if (action === 'finalize') {
    const { messages, overdueTodos } = body as {
      messages: Message[]
      overdueTodos: OverdueTodo[]
    }

    const deleteIds = await extractOverdueDecisions(messages, overdueTodos)
    if (deleteIds.length > 0) {
      await sql`UPDATE todos SET deleted_at = NOW() WHERE id = ANY(${deleteIds}::uuid[])`
    }

    await maintainMomentum(user.id)

    const [userData] = await sql<{ momentum: number }[]>`
      SELECT momentum FROM users WHERE id = ${user.id}
    `
    await sql`UPDATE users SET day_start_momentum = ${userData?.momentum ?? 0} WHERE id = ${user.id}`

    const activeQuests = await sql<{ id: string; momentum: number }[]>`
      SELECT id, momentum FROM quests WHERE user_id = ${user.id} AND status = 'active'
    `
    for (const q of activeQuests) {
      await sql`UPDATE quests SET day_start_momentum = ${q.momentum} WHERE id = ${q.id}`
    }

    return NextResponse.json({ ok: true, deleted: deleteIds.length })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
