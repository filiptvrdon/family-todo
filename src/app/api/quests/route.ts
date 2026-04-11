import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import * as questService from '@/services/quest-service'
import { Quest } from '@/lib/types'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const quests = await questService.fetchQuests(user.id)
  return NextResponse.json(quests)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body: Omit<Quest, 'id' | 'created_at' | 'momentum' | 'day_start_momentum' | 'last_momentum_increase' | 'last_momentum_decay' | 'last_momentum_nudge' | 'motivation_nudge'> = await req.json()
  if (body.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const created = await questService.createQuest(body)
  return NextResponse.json(created, { status: 201 })
}
