'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { X, User } from 'lucide-react'

interface Props {
  profile: Profile
  onClose: () => void
  onSaved: () => void
}

export default function ProfileModal({ profile, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [displayName, setDisplayName] = useState(profile.display_name || '')
  const [username, setUsername] = useState(profile.username || '')
  const [customizationPrompt, setCustomizationPrompt] = useState(profile.customization_prompt || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        username: username.trim() || null,
        customization_prompt: customizationPrompt.trim() || null,
      })
      .eq('id', profile.id)

    setSaving(false)

    if (updateError) {
      setError('Failed to save. Please try again.')
      return
    }

    onSaved()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(26, 26, 46, 0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          background: '#fff',
          boxShadow: '0 8px 32px rgba(0, 181, 200, 0.12)',
          border: '1px solid #D6EFE4',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <User size={20} style={{ color: 'var(--color-primary)' }} />
            <h2 className="font-semibold" style={{ color: 'var(--color-text)', fontSize: '1.125rem' }}>
              Your profile
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ color: 'var(--color-text-disabled)' }}
            className="transition hover:opacity-70"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={save} className="flex flex-col gap-4">
          {/* Email (read-only) */}
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Email
            </label>
            <div
              className="px-3 py-2 rounded-lg text-sm"
              style={{
                background: '#FAF7F2',
                color: 'var(--color-text-disabled)',
                border: '1px solid #D6EFE4',
              }}
            >
              {profile.email}
            </div>
          </div>

          {/* Display name */}
          <div>
            <label
              htmlFor="display-name"
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should we call you?"
              maxLength={60}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{
                border: '1px solid #D6EFE4',
                color: 'var(--color-text)',
              }}
            />
          </div>

          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. filip"
              maxLength={40}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{
                border: '1px solid #D6EFE4',
                color: 'var(--color-text)',
              }}
            />
          </div>

          {/* Customization prompt */}
          <div>
            <label
              htmlFor="customization-prompt"
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Customization prompt
            </label>
            <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-disabled)' }}>
              Tell the AI companion a bit about you — your preferences, how you like to be supported, anything that helps.
            </p>
            <textarea
              id="customization-prompt"
              value={customizationPrompt}
              onChange={(e) => setCustomizationPrompt(e.target.value)}
              placeholder="e.g. I have ADHD and work best with gentle nudges. I prefer mornings for hard tasks."
              rows={4}
              maxLength={500}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none"
              style={{
                border: '1px solid #D6EFE4',
                color: 'var(--color-text)',
              }}
            />
            <p className="text-xs mt-0.5 text-right" style={{ color: 'var(--color-text-disabled)' }}>
              {customizationPrompt.length}/500
            </p>
          </div>

          {error && (
            <p className="text-xs" style={{ color: '#FF9F7F' }}>{error}</p>
          )}

          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition"
              style={{
                border: '1px solid #D6EFE4',
                color: 'var(--color-text-secondary)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
