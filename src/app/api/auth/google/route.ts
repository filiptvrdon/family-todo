import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
    prompt: 'consent',          // ensures refresh_token is always returned
    state: user.id,             // passed through to callback for verification
  })

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params}`)
}
