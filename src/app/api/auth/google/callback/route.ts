import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-user'
import sql from '@/lib/db'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const error = searchParams.get('error')
  const code = searchParams.get('code')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/?google_error=${error ?? 'missing_code'}`)
  }

  const user = await getAuthUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const redirectUri = `${origin}/api/auth/google/callback`
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    console.error('[google/callback] token exchange failed', await tokenRes.text())
    return NextResponse.redirect(`${origin}/?google_error=token_exchange_failed`)
  }

  const { refresh_token } = await tokenRes.json()

  if (!refresh_token) {
    return NextResponse.redirect(`${origin}/`)
  }

  await sql`UPDATE users SET google_refresh_token = ${refresh_token} WHERE id = ${user.id}`

  return NextResponse.redirect(`${origin}/`)
}
