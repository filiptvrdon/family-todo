import { auth } from '@/auth'

/** Returns the authenticated user's id and email, or null if not logged in. */
export async function getAuthUser(): Promise<{ id: string; email: string } | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  return { id: session.user.id, email: session.user.email }
}
