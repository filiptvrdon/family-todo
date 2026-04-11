import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import sql from '@/lib/db'

/** GET /api/avatar/[userId] — serve avatar bytes from DB */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await params
  const rows = await sql<{ avatar_data: Buffer | null; avatar_mime: string | null }[]>`
    SELECT avatar_data, avatar_mime FROM users WHERE id = ${userId}
  `
  const row = rows[0]
  if (!row?.avatar_data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return new NextResponse(row.avatar_data as unknown as BodyInit, {
    headers: {
      'Content-Type': row.avatar_mime ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

/** POST /api/avatar/[userId] — upload avatar bytes to DB */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await params
  if (user.id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const contentType = req.headers.get('content-type') ?? 'image/jpeg'
  const buffer = Buffer.from(await req.arrayBuffer())

  await sql`
    UPDATE users SET avatar_data = ${buffer}, avatar_mime = ${contentType} WHERE id = ${userId}
  `

  return NextResponse.json({ ok: true })
}
