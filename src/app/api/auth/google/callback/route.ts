import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const error = searchParams.get('error')
  const code = searchParams.get('code')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/?google_error=${error ?? 'missing_code'}`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  // Exchange authorization code for tokens
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
    // Google only returns a refresh_token on the first consent; if missing, the user already
    // granted access and we should already have a token stored — just redirect.
    return NextResponse.redirect(`${origin}/`)
  }

  const { error: dbError } = await supabase
    .from('users')
    .update({ google_refresh_token: refresh_token })
    .eq('id', user.id)

  if (dbError) {
    console.error('[google/callback] failed to store token', dbError)
    return NextResponse.redirect(`${origin}/?google_error=db_error`)
  }

  return NextResponse.redirect(`${origin}/`)
}
