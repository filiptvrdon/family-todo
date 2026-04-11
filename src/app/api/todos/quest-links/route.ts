import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import { fetchQuestLinksForTasks } from '@/services/quest-service'

/** GET /api/todos/quest-links?ids=id1,id2,... — quest links for multiple todos */
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ids = req.nextUrl.searchParams.get('ids')
  if (!ids) return NextResponse.json({})

  const taskIds = ids.split(',').filter(Boolean)
  const map = await fetchQuestLinksForTasks(taskIds)
  return NextResponse.json(map)
}
