import sql from '@/lib/db'
import { User } from '@/lib/types'

export async function fetchUser(userId: string): Promise<User | null> {
  const [row] = await sql<User[]>`SELECT * FROM users WHERE id = ${userId}`
  return row ?? null
}

export async function fetchUserByEmail(email: string): Promise<User | null> {
  const [row] = await sql<User[]>`SELECT * FROM users WHERE email = ${email}`
  return row ?? null
}

export async function fetchPartner(partnerId: string): Promise<User | null> {
  const [row] = await sql<User[]>`SELECT * FROM users WHERE id = ${partnerId}`
  return row ?? null
}

export async function upsertUser(id: string, email: string): Promise<User> {
  const [row] = await sql<User[]>`
    INSERT INTO users (id, email)
    VALUES (${id}, ${email})
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
    RETURNING *
  `
  return row
}

export async function updateUser(id: string, patch: Partial<User>): Promise<User> {
  // Strip fields that aren't real columns or shouldn't be updated directly
  const { id: _, created_at, ...data } = patch as Record<string, unknown>
  void id; void created_at
  const filtered = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  if (Object.keys(filtered).length === 0) {
    const existing = await fetchUser(id)
    if (!existing) throw new Error('User not found')
    return existing
  }
  const [row] = await sql<User[]>`
    UPDATE users SET ${sql(filtered)} WHERE id = ${id} RETURNING *
  `
  return row
}
