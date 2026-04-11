import { NextResponse } from 'next/server'

/**
 * Auth.js handles OAuth callbacks internally via /api/auth/callback/[provider].
 * This route was the Supabase OAuth callback — kept as a redirect safety net.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/`)
}
