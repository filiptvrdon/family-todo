import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth(function proxy(req) {
  const isLoggedIn = !!req.auth
  const path = req.nextUrl.pathname
  const isLoginPage = path === '/login'
  const isAuthRoute = path.startsWith('/api/auth')
  const isAuthCallback = path.startsWith('/auth/callback')

  if (!isLoggedIn && !isLoginPage && !isAuthRoute && !isAuthCallback) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
