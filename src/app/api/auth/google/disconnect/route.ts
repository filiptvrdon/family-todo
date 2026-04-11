import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import sql from '@/lib/db'

export async function POST() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await sql`UPDATE users SET google_refresh_token = null WHERE id = ${user.id}`

  return NextResponse.json({ ok: true })
}
