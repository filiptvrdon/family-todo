'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile, Todo, CalendarEvent } from '@/lib/types'
import CheckIn, { hasCheckedInToday } from '@/components/CheckIn'
import ProfileModal from '@/components/ProfileModal'
import MobileLayout from '@/components/MobileLayout'
import DesktopLayout from '@/components/DesktopLayout'
import { Heart, UserCircle } from 'lucide-react'

interface Props {
  profile: Profile
  partner: Profile | null
  myTodos: Todo[]
  partnerTodos: Todo[]
  allEvents: CalendarEvent[]
  googleConnected: boolean
}

export default function Dashboard({ profile, partner, myTodos, partnerTodos, allEvents, googleConnected }: Props) {
  const [localMyTodos, setLocalMyTodos] = useState<Todo[]>(myTodos)
  const [localPartnerTodos, setLocalPartnerTodos] = useState<Todo[]>(partnerTodos)
  const [showCheckin, setShowCheckin] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { setLocalMyTodos(myTodos) }, [myTodos])
  useEffect(() => { setLocalPartnerTodos(partnerTodos) }, [partnerTodos])

  const refreshLocal = useCallback(async () => {
    const [{ data: mine }, { data: theirs }] = await Promise.all([
      supabase.from('todos').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }),
      partner?.id
        ? supabase.from('todos').select('*').eq('user_id', partner.id).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as Todo[] }),
    ])
    if (mine) setLocalMyTodos(mine)
    if (theirs) setLocalPartnerTodos(theirs ?? [])
  }, [supabase, profile.id, partner?.id])

  const refresh = useCallback(() => router.refresh(), [router])

  const completeTodo = useCallback(async (todoId: string) => {
    setLocalMyTodos((prev) => prev.map((t) => t.id === todoId ? { ...t, completed: true } : t))
    await supabase.from('todos').update({ completed: true }).eq('id', todoId)
    refresh()
  }, [supabase, refresh])

  useEffect(() => {
    if (!hasCheckedInToday()) setShowCheckin(true)
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const myName = profile?.display_name || profile?.email?.split('@')[0] || 'You'
  const partnerName = partner?.display_name || partner?.email?.split('@')[0] || 'Partner'

  const sharedProps = {
    profile,
    partner,
    myTodos: localMyTodos,
    partnerTodos: localPartnerTodos,
    allEvents,
    myName,
    partnerName,
    onRefresh: () => { refreshLocal(); refresh() },
  }

  return (
    <div
      className="flex flex-col min-h-screen md:h-screen md:overflow-hidden"
      style={{ background: 'var(--background)' }}
    >
      {/* ── Header ── */}
      <header
        className="shrink-0 sticky top-0 z-10"
        style={{
          background: '#fff',
          borderBottom: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="layout-container py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart size={20} fill="currentColor" style={{ color: 'var(--color-completion)' }} />
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Family Todo</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProfile(true)}
              className="transition hover:opacity-80"
              title="Your profile"
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="rounded-full object-cover"
                  style={{ width: 28, height: 28, border: '2px solid #D6EFE4' }}
                />
              ) : (
                <UserCircle size={24} style={{ color: 'var(--color-text-disabled)' }} />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile layout (< md) ── */}
      <div className="flex-1 md:hidden overflow-y-auto">
        <MobileLayout {...sharedProps} />
      </div>

      {/* ── Desktop layout (≥ md): fills remaining viewport height ── */}
      <div
        className="hidden md:flex flex-col"
        style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
      >
        <DesktopLayout {...sharedProps} onTodoComplete={completeTodo} />
      </div>

      {showProfile && (
        <ProfileModal
          profile={profile}
          googleConnected={googleConnected}
          onClose={() => setShowProfile(false)}
          onSaved={refresh}
          onGoogleDisconnected={refresh}
          onSignOut={signOut}
        />
      )}

      {showCheckin && (
        <CheckIn
          userName={myName}
          myTodos={localMyTodos}
          allEvents={allEvents}
          onDone={() => {
            setShowCheckin(false)
            refreshLocal()
            refresh()
          }}
        />
      )}
    </div>
  )
}
