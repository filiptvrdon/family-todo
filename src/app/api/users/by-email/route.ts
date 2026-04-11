import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import { fetchUserByEmail } from '@/services/user-service'

/** GET /api/users/by-email?email=... — look up a user by email (for partner connect) */
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

  const found = await fetchUserByEmail(email)
  if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only return id — don't leak full user data
  return NextResponse.json({ id: found.id })
}
