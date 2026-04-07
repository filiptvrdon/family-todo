'use client'

import PartnerConnect from '@/components/PartnerConnect'
import { X } from 'lucide-react'

interface Props {
  myId: string
  onClose: () => void
  onConnected: () => void
}

export function PartnerConnectSection({ myId, onClose, onConnected }: Props) {
  return (
    <div className="relative mb-6">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 z-10 text-text-disabled hover:text-text"
      >
        <X size={16} />
      </button>
      <PartnerConnect
        myId={myId}
        onConnected={onConnected}
      />
    </div>
  )
}
