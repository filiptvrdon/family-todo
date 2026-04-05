'use client'

import { useState } from 'react'
import { User, Todo } from '@/lib/types'
import TodoList from '@/components/TodoList'
import PartnerConnect from '@/components/PartnerConnect'
import { X, Users, User as UserIcon } from 'lucide-react'

interface Props {
  user: User
  partner: User | null
  myTodos: Todo[]
  partnerTodos: Todo[]
  myName: string
  partnerName: string
  onRefresh: () => void
}

export default function TaskBoard({
  user, partner, myTodos, partnerTodos, myName, partnerName, onRefresh
}: Props) {
  const [view, setView] = useState<'me' | 'partner'>('me')
  const [showConnect, setShowConnect] = useState(false)

  const activeTodos = view === 'me' ? myTodos : partnerTodos
  const isOwner = view === 'me'
  const activeUserId = view === 'me' ? user.id : (partner?.id || '')

  return (
    <div className="flex flex-col h-full overflow-hidden min-w-0">
      {/* View Switcher */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 md:p-4 border-b border-border bg-card">
        <div className="flex items-center gap-1 bg-foam p-1 rounded-lg">
          <button
            onClick={() => setView('me')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition min-w-0"
            style={{
              background: view === 'me' ? 'var(--card)' : 'transparent',
              color: view === 'me' ? 'var(--color-text)' : 'var(--color-text-secondary)',
              boxShadow: view === 'me' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <UserIcon size={14} className="shrink-0" />
            <span className="truncate">{myName}</span>
          </button>
          {partner && (
            <button
              onClick={() => setView('partner')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition min-w-0"
              style={{
                background: view === 'partner' ? 'var(--card)' : 'transparent',
                color: view === 'partner' ? 'var(--color-text)' : 'var(--color-text-secondary)',
                boxShadow: view === 'partner' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Users size={14} className="shrink-0" />
              <span className="truncate">{partnerName}</span>
            </button>
          )}
        </div>

        {!partner && !showConnect && (
          <button
            onClick={() => setShowConnect(true)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Connect Partner
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {showConnect && !partner && (
          <div className="relative mb-6">
            <button
              onClick={() => setShowConnect(false)}
              className="absolute top-2 right-2 z-10 text-text-disabled hover:text-text"
            >
              <X size={16} />
            </button>
            <PartnerConnect
              myId={user.id}
              onConnected={() => { setShowConnect(false); onRefresh() }}
            />
          </div>
        )}

        {view === 'partner' && !partner && (
          <div className="text-center py-12">
            <p className="text-sm text-text-disabled mb-4">No partner connected yet.</p>
            <button
              onClick={() => setShowConnect(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
            >
              Connect your partner
            </button>
          </div>
        )}

        <TodoList
          todos={activeTodos}
          isOwner={isOwner}
          userId={activeUserId}
          parentId={null}
          onRefresh={onRefresh}
          useInternalDndContext={false}
        />
      </div>
    </div>
  )
}
