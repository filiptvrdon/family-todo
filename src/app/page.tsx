import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Dashboard from '@/components/Dashboard'
import { refreshAccessToken, fetchGoogleCalendarEvents } from '@/lib/google-calendar'
import { CalendarEvent } from '@/lib/types'
import { fetchUser } from '@/services/user-service'
import { fetchTopLevelTodos } from '@/services/todo-service'
import { fetchCalendarEvents } from '@/services/event-service'

export default async function Home() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  const dbUser = await fetchUser(userId)
  if (!dbUser) redirect('/login?error=user_missing')

  let partner = null
  if (dbUser.partner_id) {
    partner = await fetchUser(dbUser.partner_id)
  }

  const [myTodos, partnerTodos, myEvents, partnerEvents] = await Promise.all([
    fetchTopLevelTodos(userId),
    dbUser.partner_id ? fetchTopLevelTodos(dbUser.partner_id) : Promise.resolve([]),
    fetchCalendarEvents(userId),
    dbUser.partner_id ? fetchCalendarEvents(dbUser.partner_id) : Promise.resolve([]),
  ])

  let googleEvents: CalendarEvent[] = []
  if (dbUser.google_refresh_token) {
    try {
      const accessToken = await refreshAccessToken(dbUser.google_refresh_token)
      const now = new Date()
      const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      googleEvents = await fetchGoogleCalendarEvents(accessToken, userId, now, twoWeeksOut)
    } catch (err) {
      console.error('[google calendar] failed to fetch events', err)
    }
  }

  return (
    <Dashboard
      user={dbUser}
      partner={partner}
      myTodos={myTodos}
      partnerTodos={partnerTodos}
      allEvents={[...myEvents, ...partnerEvents, ...googleEvents]}
      googleConnected={!!dbUser.google_refresh_token}
    />
  )
}
