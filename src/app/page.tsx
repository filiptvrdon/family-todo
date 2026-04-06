import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Dashboard from '@/components/Dashboard'
import { refreshAccessToken, fetchGoogleCalendarEvents } from '@/lib/google-calendar'
import { CalendarEvent, Quest } from '@/lib/types'
import { maintainMomentum } from '@/lib/momentum'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Maintain momentum (decay + nudges) in background-ish way
  // We await it here because it might affect the dbUser we're about to fetch
  await maintainMomentum(user.id)

  const { error: upsertError } = await supabase.from('users').upsert(
    { id: user.id, email: user.email! },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  if (upsertError) console.error('[user upsert]', upsertError)

  const { data: dbUser, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (userError) console.error('[user select]', userError)
  if (!dbUser) redirect('/login?error=user_missing')

  let partner = null
  if (dbUser?.partner_id) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', dbUser.partner_id)
      .single()
    partner = data
  }

  const { data: myTodosRaw } = await supabase
    .from('todos')
    .select('*, subtasks_count:todos(count)')
    .eq('user_id', user.id)
    .is('parent_id', null)
    .order('index', { ascending: true })

  const myTodos = (myTodosRaw ?? []).map(t => ({
    ...t,
    subtasks_count: (t.subtasks_count as unknown as { count: number }[])?.[0]?.count ?? 0
  }))

  const { data: partnerTodosRaw } = dbUser?.partner_id
    ? await supabase.from('todos').select('*, subtasks_count:todos(count)').eq('user_id', dbUser.partner_id).is('parent_id', null).order('index', { ascending: true })
    : { data: [] }

  const partnerTodos = (partnerTodosRaw ?? []).map(t => ({
    ...t,
    subtasks_count: (t.subtasks_count as unknown as { count: number }[])?.[0]?.count ?? 0
  }))

  const { data: myEvents } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', user.id)

  const { data: partnerEvents } = dbUser?.partner_id
    ? await supabase.from('calendar_events').select('*').eq('user_id', dbUser.partner_id)
    : { data: [] }

  const { data: pinnedQuests } = await supabase
    .from('quests')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .eq('pinned', true)
    .order('created_at', { ascending: true })
    .limit(3)

  // Fetch Google Calendar events if the user has connected their account
  let googleEvents: CalendarEvent[] = []
  const googleRefreshToken = dbUser.google_refresh_token
  if (googleRefreshToken) {
    try {
      const accessToken = await refreshAccessToken(googleRefreshToken)
      const now = new Date()
      const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      googleEvents = await fetchGoogleCalendarEvents(accessToken, user.id, now, twoWeeksOut)
    } catch (err) {
      console.error('[google calendar] failed to fetch events', err)
    }
  }

  return (
    <Dashboard
      user={dbUser}
      partner={partner}
      myTodos={myTodos ?? []}
      partnerTodos={partnerTodos ?? []}
      allEvents={[...(myEvents ?? []), ...(partnerEvents ?? []), ...googleEvents]}
      googleConnected={!!googleRefreshToken}
      pinnedQuests={(pinnedQuests ?? []) as Quest[]}
    />
  )
}
