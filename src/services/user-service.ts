import sql from '@/lib/db'
import { User } from '@/lib/types'

type DbUser = Omit<User, 'avatar_data'> & { avatar_data: Buffer | null }

function parseUser(row: DbUser): User {
  return { ...row, avatar_data: row.avatar_data != null }
}

export async function fetchUser(userId: string): Promise<User | null> {
  const [row] = await sql<DbUser[]>`SELECT * FROM users WHERE id = ${userId}`
  return row ? parseUser(row) : null
}

export async function fetchUserByEmail(email: string): Promise<User | null> {
  const [row] = await sql<DbUser[]>`SELECT * FROM users WHERE email = ${email}`
  return row ? parseUser(row) : null
}

export async function fetchPartner(partnerId: string): Promise<User | null> {
  const [row] = await sql<DbUser[]>`SELECT * FROM users WHERE id = ${partnerId}`
  return row ? parseUser(row) : null
}

export async function upsertUser(id: string, email: string): Promise<User> {
  const [row] = await sql<DbUser[]>`
    INSERT INTO users (id, email)
    VALUES (${id}, ${email})
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
    RETURNING *
  `
  return parseUser(row)
}

export async function updateUser(id: string, patch: Partial<User>): Promise<User> {
  // Strip fields that aren't real columns or shouldn't be updated directly
  const { id: _id, created_at, avatar_data, ...data } = patch as Record<string, unknown>
  void _id; void created_at; void avatar_data
  const filtered = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  if (Object.keys(filtered).length === 0) {
    const existing = await fetchUser(id)
    if (!existing) throw new Error('User not found')
    return existing
  }
  const [row] = await sql<DbUser[]>`
    UPDATE users SET ${sql(filtered)} WHERE id = ${id} RETURNING *
  `
  return parseUser(row)
}
