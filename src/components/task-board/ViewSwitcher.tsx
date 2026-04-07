'use client'

import { User } from '@/lib/types'
import { Users, User as UserIcon } from 'lucide-react'

interface Props {
  view: 'me' | 'partner'
  onViewChange: (view: 'me' | 'partner') => void
  partner: User | null
  myName: string
  partnerName: string
  showConnectButton: boolean
  onConnectClick: () => void
}

export function ViewSwitcher({
  view,
  onViewChange,
  partner,
  myName,
  partnerName,
  showConnectButton,
  onConnectClick,
}: Props) {
  return (
    <div className="shrink-0 flex items-center justify-between px-4 py-3 md:p-4 border-b border-border bg-card">
      <div className="flex items-center gap-1 bg-foam p-1 rounded-lg">
        <button
          onClick={() => onViewChange('me')}
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
            onClick={() => onViewChange('partner')}
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

      {showConnectButton && (
        <button
          onClick={onConnectClick}
          className="text-xs font-medium text-primary hover:underline"
        >
          Connect Partner
        </button>
      )}
    </div>
  )
}
