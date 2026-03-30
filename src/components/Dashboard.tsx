'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile, Todo, CalendarEvent } from '@/lib/types'
import TodoColumn from '@/components/TodoColumn'
import SharedCalendar from '@/components/SharedCalendar'
import PartnerConnect from '@/components/PartnerConnect'
import { Heart, LogOut, Settings, X } from 'lucide-react'

interface Props {
  profile: Profile
  partner: Profile | null
  myTodos: Todo[]
  partnerTodos: Todo[]
  allEvents: CalendarEvent[]
}

type Tab = 'todos' | 'calendar'

export default function Dashboard({ profile, partner, myTodos, partnerTodos, allEvents }: Props) {
  const [tab, setTab] = useState<Tab>('todos')
  const [showConnect, setShowConnect] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const refresh = useCallback(() => router.refresh(), [router])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const myName = profile?.display_name || profile?.email?.split('@')[0] || 'You'
  const partnerName = partner?.display_name || partner?.email?.split('@')[0] || 'Partner'

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="text-rose-500" size={20} fill="currentColor" />
            <span className="font-semibold text-gray-800">Family Todo</span>
          </div>

          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setTab('todos')}
              className={`text-sm px-3 py-1 rounded-md transition font-medium ${tab === 'todos' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setTab('calendar')}
              className={`text-sm px-3 py-1 rounded-md transition font-medium ${tab === 'calendar' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Calendar
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!partner && (
              <button
                onClick={() => setShowConnect(!showConnect)}
                className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium"
              >
                <Settings size={14} />
                {showConnect ? 'Close' : 'Connect partner'}
              </button>
            )}
            <button onClick={signOut} className="text-gray-400 hover:text-gray-600 transition">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {showConnect && !partner && (
          <div className="relative">
            <button
              onClick={() => setShowConnect(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 z-10"
            >
              <X size={16} />
            </button>
            <PartnerConnect
              myId={profile.id}
              onConnected={() => { setShowConnect(false); refresh() }}
            />
          </div>
        )}

        {!partner && !showConnect && (
          <div className="text-center py-4 mb-4">
            <p className="text-sm text-gray-400">
              No partner connected yet.{' '}
              <button onClick={() => setShowConnect(true)} className="text-indigo-500 hover:underline">
                Connect your partner
              </button>{' '}
              to see their tasks.
            </p>
          </div>
        )}

        {tab === 'todos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <TodoColumn
                todos={myTodos}
                ownerName={myName}
                isOwner={true}
                userId={profile.id}
                onRefresh={refresh}
              />
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              {partner ? (
                <TodoColumn
                  todos={partnerTodos}
                  ownerName={partnerName}
                  isOwner={false}
                  userId={partner.id}
                  onRefresh={refresh}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-48 text-gray-300">
                  <Heart size={32} />
                  <p className="text-sm mt-2">Partner's tasks will appear here</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'calendar' && (
          <SharedCalendar
            events={allEvents}
            myUserId={profile.id}
            partnerUserId={partner?.id ?? null}
            myColor="#f43f5e"
            partnerColor="#6366f1"
            onRefresh={refresh}
          />
        )}
      </main>
    </div>
  )
}
