import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import * as eventService from '@/services/event-service'
import { fetchUser } from '@/services/user-service'
import { CalendarEvent } from '@/lib/types'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const dbUser = await fetchUser(user.id)
  const events = await eventService.fetchCalendarEvents(user.id, dbUser?.partner_id ?? null)
  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body: Omit<CalendarEvent, 'id' | 'created_at'> = await req.json()
  if (body.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const created = await eventService.createEvent(body)
  return NextResponse.json(created, { status: 201 })
}
