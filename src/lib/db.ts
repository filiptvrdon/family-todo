import postgres from 'postgres'

// Singleton to avoid connection pool proliferation in Next.js dev (hot-reload).
declare global {
  // eslint-disable-next-line no-var
  var __db: ReturnType<typeof postgres> | undefined
}

const sql = global.__db ?? postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
})

if (process.env.NODE_ENV !== 'production') {
  global.__db = sql
}

export default sql
