import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import { fetchQuestsForTask } from '@/services/quest-service'

/** GET /api/todos/[id]/quests — quest IDs linked to a todo */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const questIds = await fetchQuestsForTask(id)
  return NextResponse.json(questIds)
}
