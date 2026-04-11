import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import * as habitService from '@/services/habit-service'
import { Habit } from '@/lib/types'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const habits = await habitService.fetchHabits(user.id)
  return NextResponse.json(habits)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body: Omit<Habit, 'id' | 'created_at'> = await req.json()
  if (body.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const created = await habitService.createHabit(body)
  return NextResponse.json(created, { status: 201 })
}
