import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Dashboard from '@/components/Dashboard'
import { refreshAccessToken, fetchGoogleCalendarEvents } from '@/lib/google-calendar'
import { CalendarEvent } from '@/lib/types'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { error: upsertError } = await supabase.from('profiles').upsert(
    { id: user.id, email: user.email! },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  if (upsertError) console.error('[profile upsert]', upsertError)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) console.error('[profile select]', profileError)
  if (!profile) redirect('/login?error=profile_missing')

  let partner = null
  if (profile?.partner_id) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile.partner_id)
      .single()
    partner = data
  }

  const { data: myTodos } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: partnerTodos } = profile?.partner_id
    ? await supabase.from('todos').select('*').eq('user_id', profile.partner_id).order('created_at', { ascending: false })
    : { data: [] }

  const { data: myEvents } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', user.id)

  const { data: partnerEvents } = profile?.partner_id
    ? await supabase.from('calendar_events').select('*').eq('user_id', profile.partner_id)
    : { data: [] }

  // Fetch Google Calendar events if the user has connected their account
  let googleEvents: CalendarEvent[] = []
  const googleRefreshToken = profile.google_refresh_token
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
      profile={profile}
      partner={partner}
      myTodos={myTodos ?? []}
      partnerTodos={partnerTodos ?? []}
      allEvents={[...(myEvents ?? []), ...(partnerEvents ?? []), ...googleEvents]}
      googleConnected={!!googleRefreshToken}
    />
  )
}
