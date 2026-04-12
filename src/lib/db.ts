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
  types: {
    // Return date columns as YYYY-MM-DD strings instead of Date objects.
    // Prevents mismatch with client-side date strings (e.g. due_date, period_date).
    date: {
      to: 1082,
      from: [1082],
      serialize: (x: string | Date) => x instanceof Date ? x.toISOString().split('T')[0] : x,
      parse: (x: string) => x,
    },
  },
})

if (process.env.NODE_ENV !== 'production') {
  global.__db = sql
}

export default sql
