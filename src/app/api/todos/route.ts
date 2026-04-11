import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import * as todoService from '@/services/todo-service'
import * as questService from '@/services/quest-service'
import { fetchUser } from '@/services/user-service'
import { Todo } from '@/lib/types'

/** GET /api/todos — returns { mine, theirs } for the authenticated user */
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await fetchUser(user.id)
  const [mine, theirs] = await Promise.all([
    todoService.fetchTodos(user.id),
    dbUser?.partner_id ? todoService.fetchTodos(dbUser.partner_id) : Promise.resolve([]),
  ])

  return NextResponse.json({ mine, theirs })
}

/** POST /api/todos — create a todo, optionally syncing quest links from parent */
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: Omit<Todo, 'id' | 'created_at'> = await req.json()
  if (body.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const created = await todoService.createTodo(body)

  // Propagate quest links from parent to this new subtask
  if (body.parent_id) {
    try {
      const questIds = await questService.fetchQuestsForTask(body.parent_id)
      await Promise.all(questIds.map(qid => questService.linkTask(qid, created.id)))
    } catch (e) {
      console.error('[todos/create] quest link sync failed', e)
    }
  }

  return NextResponse.json(created, { status: 201 })
}
