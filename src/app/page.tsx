import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Dashboard from '@/components/Dashboard'

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

  return (
    <Dashboard
      profile={profile}
      partner={partner}
      myTodos={myTodos ?? []}
      partnerTodos={partnerTodos ?? []}
      allEvents={[...(myEvents ?? []), ...(partnerEvents ?? [])]}
    />
  )
}
