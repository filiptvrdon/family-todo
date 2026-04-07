'use client'

interface Props {
  onConnectClick: () => void
}

export function EmptyPartnerView({ onConnectClick }: Props) {
  return (
    <div className="text-center py-12">
      <p className="text-sm text-text-disabled mb-4">No partner connected yet.</p>
      <button
        onClick={onConnectClick}
        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
      >
        Connect your partner
      </button>
    </div>
  )
}
