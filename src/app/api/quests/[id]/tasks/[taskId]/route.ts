import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import * as questService from '@/services/quest-service'

/** PUT /api/quests/[id]/tasks/[taskId] — link a task to a quest */
export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: questId, taskId } = await params
  await questService.linkTask(questId, taskId)
  return NextResponse.json({ ok: true })
}

/** DELETE /api/quests/[id]/tasks/[taskId] — unlink a task from a quest */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: questId, taskId } = await params
  await questService.unlinkTask(questId, taskId)
  return NextResponse.json({ ok: true })
}
