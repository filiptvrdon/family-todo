import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import sql from '@/lib/db'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
    }
  }
}

async function findUserByEmail(email: string) {
  const rows = await sql<{ id: string; email: string; password_hash: string | null }[]>`
    SELECT id, email, password_hash FROM users WHERE email = ${email}
  `
  return rows[0] ?? null
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const user = await findUserByEmail(email)
        if (!user || !user.password_hash) return null

        const valid = await bcrypt.compare(password, user.password_hash)
        if (!valid) return null

        return { id: user.id, email: user.email }
      },
    }),
    Google,
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email = user.email
        if (!email) return false
        const existing = await findUserByEmail(email)
        if (!existing) return false
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.sub = user.id
      }
      // For Google sign-in, resolve email to internal user ID
      if (account?.provider === 'google') {
        const email = token.email
        if (email) {
          const existing = await findUserByEmail(email)
          if (existing) token.sub = existing.id
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
