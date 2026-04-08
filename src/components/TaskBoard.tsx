'use client'

import { useState } from 'react'
import { User, Todo } from '@/lib/types'
import TodoList from '@/components/TodoList'
import { ViewSwitcher } from './task-board/ViewSwitcher'
import { PartnerConnectSection } from './task-board/PartnerConnectSection'
import { EmptyPartnerView } from './task-board/EmptyPartnerView'

interface Props {
  user: User
  partner: User | null
  myTodos: Todo[]
  partnerTodos: Todo[]
  myName: string
  partnerName: string
  onRefresh: () => void
  isSubtaskMode: boolean
}

export default function TaskBoard({
  user, partner, myTodos, partnerTodos, myName, partnerName, onRefresh, isSubtaskMode
}: Props) {
  const [view, setView] = useState<'me' | 'partner'>('me')
  const [showConnect, setShowConnect] = useState(false)

  const activeTodos = view === 'me' ? myTodos : partnerTodos
  const isOwner = view === 'me'
  const activeUserId = view === 'me' ? user.id : (partner?.id || '')

  return (
    <div className="flex flex-col h-full overflow-hidden min-w-0">
      <ViewSwitcher 
        view={view}
        onViewChange={setView}
        partner={partner}
        myName={myName}
        partnerName={partnerName}
        showConnectButton={!partner && !showConnect}
        onConnectClick={() => setShowConnect(true)}
      />

      <div className="flex-1 overflow-y-auto p-4">
        {showConnect && !partner && (
          <PartnerConnectSection 
            myId={user.id}
            onClose={() => setShowConnect(false)}
            onConnected={() => { setShowConnect(false); onRefresh() }}
          />
        )}

        {view === 'partner' && !partner && (
          <EmptyPartnerView onConnectClick={() => setShowConnect(true)} />
        )}

        <TodoList
          todos={activeTodos}
          isOwner={isOwner}
          userId={activeUserId}
          parentId={null}
          onRefresh={onRefresh}
          useInternalDndContext={false}
          isSubtaskMode={isSubtaskMode}
        />
      </div>
    </div>
  )
}
