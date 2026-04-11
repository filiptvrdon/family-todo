import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import * as habitService from '@/services/habit-service'
import { HabitTracking } from '@/lib/types'

/** GET /api/habit-tracking?dates=2024-01-01,2024-01-07 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const datesParam = req.nextUrl.searchParams.get('dates') ?? ''
  const dates = datesParam ? datesParam.split(',') : []
  const tracking = await habitService.fetchTrackingForPeriod(user.id, dates)
  return NextResponse.json(tracking)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body: Omit<HabitTracking, 'id' | 'logged_at'> = await req.json()
  if (body.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const entry = await habitService.logEntry(body)
  return NextResponse.json(entry, { status: 201 })
}
