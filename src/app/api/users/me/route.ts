import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import * as userService from '@/services/user-service'
import { User } from '@/lib/types'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const dbUser = await userService.fetchUser(user.id)
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let partner = null
  if (dbUser.partner_id) {
    partner = await userService.fetchUser(dbUser.partner_id)
  }

  return NextResponse.json({ user: dbUser, partner })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const patch: Partial<User> = await req.json()
  const updated = await userService.updateUser(user.id, patch)
  return NextResponse.json(updated)
}
