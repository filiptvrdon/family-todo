import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import * as eventService from '@/services/event-service'
import { CalendarEvent } from '@/lib/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const patch: Partial<CalendarEvent> = await req.json()
  const updated = await eventService.updateEvent(id, patch)
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await eventService.deleteEvent(id)
  return NextResponse.json({ ok: true })
}
