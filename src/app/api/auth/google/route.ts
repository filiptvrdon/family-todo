import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-user'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

export async function GET(request: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { origin } = new URL(request.url)
  const redirectUri = `${origin}/api/auth/google/callback`

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: user.id,
  })

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params}`)
}
