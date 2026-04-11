import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import * as todoService from '@/services/todo-service'
import * as questService from '@/services/quest-service'
import { Todo } from '@/lib/types'

/** GET /api/todos/[id] — fetch a single todo */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const todo = await todoService.fetchTodoById(id)
  if (!todo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(todo)
}

/** PATCH /api/todos/[id] — update a todo */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const patch: Partial<Todo> = await req.json()

  const existing = await todoService.fetchTodoById(id)
  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await todoService.updateTodo(id, patch)

  if (patch.parent_id) {
    try {
      const questIds = await questService.fetchQuestsForTask(patch.parent_id)
      await Promise.all(questIds.map(qid => questService.linkTask(qid, id)))
    } catch (e) {
      console.error('[todos/update] quest link sync failed', e)
    }
  }

  return NextResponse.json(updated)
}

/** DELETE /api/todos/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await todoService.fetchTodoById(id)
  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await todoService.deleteTodo(id)
  return NextResponse.json({ ok: true })
}
