'use client'

import { useRef, useState } from 'react'
import { useUserStore } from '@/stores/user-store'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/lib/types'
import { X, User as UserIcon, Camera, CalendarDays, Loader2, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
  user: User
  googleConnected: boolean
  onClose: () => void
  onGoogleDisconnected: () => void
  onSignOut: () => void
}

export default function UserModal({ user, googleConnected, onClose, onGoogleDisconnected, onSignOut }: Props) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(user.display_name || '')
  const [username, setUsername] = useState(user.username || '')
  const [customizationPrompt, setCustomizationPrompt] = useState(user.customization_prompt || '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url || null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [disconnecting, setDisconnecting] = useState(false)

  async function disconnectGoogle() {
    setDisconnecting(true)
    try {
      await fetch('/api/auth/google/disconnect', { method: 'POST' })
      onGoogleDisconnected()
    } finally {
      setDisconnecting(false)
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    let avatarUrl = user.avatar_url

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })

      if (uploadError) {
        setError('Failed to upload avatar. Please try again.')
        setSaving(false)
        return
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      // Bust cache by appending a timestamp
      avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`
    }

    const patch = {
      display_name: displayName.trim(),
      username: username.trim() || null,
      customization_prompt: customizationPrompt.trim() || null,
      avatar_url: avatarUrl,
    }

    try {
      await useUserStore.getState().updateUser(user.id, patch)
      onClose()
    } catch (err) {
      console.error('Error updating user:', err)
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--overlay-bg)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto bg-card border border-border shadow-[0_8px_32px_rgba(0,181,200,0.12)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <UserIcon size={20} className="text-primary" />
            <h2 className="font-semibold text-foreground text-lg">Your profile</h2>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-foam border border-foam">
            <span className="text-xs font-bold text-foreground">{user.momentum || 0}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">Momentum</span>
          </div>
          <button onClick={onClose} className="text-text-disabled transition hover:opacity-70">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={save} className="flex flex-col gap-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2 mb-2">
            <motion.button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              whileTap={{ scale: 0.95 }}
              className="relative group cursor-pointer"
              title="Change profile picture"
            >
              <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-foam border-2 border-foam">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Profile picture" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={36} className="text-primary" />
                )}
              </div>
              {/* Hover overlay — rgba tint, kept inline */}
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0, 181, 200, 0.5)' }}
              >
                <Camera size={20} color="#fff" />
              </div>
            </motion.button>
            <p className="text-xs text-text-disabled">Click to change photo</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Email</label>
            <div className="px-3 py-2 rounded-lg text-sm bg-background text-text-disabled border border-border">
              {user.email}
            </div>
          </div>

          {/* Display name */}
          <div>
            <label htmlFor="display-name" className="block text-xs font-medium mb-1 text-muted-foreground">
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should we call you?"
              maxLength={60}
              className="w-full px-3 py-2 rounded-lg text-sm border border-border text-foreground bg-background focus:outline-none"
            />
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-xs font-medium mb-1 text-muted-foreground">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. filip"
              maxLength={40}
              className="w-full px-3 py-2 rounded-lg text-sm border border-border text-foreground bg-background focus:outline-none"
            />
          </div>

          {/* Customization prompt */}
          <div>
            <label htmlFor="customization-prompt" className="block text-xs font-medium mb-1 text-muted-foreground">
              Customization prompt
            </label>
            <p className="text-xs mb-1.5 text-text-disabled">
              Tell the AI companion a bit about you — your preferences, how you like to be supported, anything that helps.
            </p>
            <textarea
              id="customization-prompt"
              value={customizationPrompt}
              onChange={(e) => setCustomizationPrompt(e.target.value)}
              placeholder="e.g. I have ADHD and work best with gentle nudges. I prefer mornings for hard tasks."
              rows={4}
              maxLength={500}
              className="w-full px-3 py-2 rounded-lg text-sm border border-border text-foreground bg-background focus:outline-none resize-none"
            />
            <p className="text-xs mt-0.5 text-right text-text-disabled">{customizationPrompt.length}/500</p>
          </div>

          {/* Google Calendar */}
          <div className="flex items-center justify-between rounded-xl px-4 py-3 bg-background border border-border">
            <div className="flex items-center gap-2">
              {/* Icon color is dynamic (connected state), kept inline */}
              <CalendarDays size={16} style={{ color: googleConnected ? 'var(--color-completion)' : 'var(--color-text-disabled)' }} />
              <div>
                <p className="text-sm font-medium text-foreground">Google Calendar</p>
                <p className="text-xs text-text-disabled">{googleConnected ? 'Connected' : 'Not connected'}</p>
              </div>
            </div>
            {googleConnected ? (
              <button
                type="button"
                onClick={disconnectGoogle}
                disabled={disconnecting}
                className="text-xs font-medium transition flex items-center gap-1 disabled:opacity-50 text-destructive"
              >
                {disconnecting && <Loader2 size={12} className="animate-spin" />}
                Disconnect
              </button>
            ) : (
              <a href="/api/auth/google" className="text-xs font-medium transition text-primary">
                Connect
              </a>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition border border-border text-muted-foreground"
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 bg-primary text-primary-foreground cursor-pointer"
            >
              {saving ? 'Saving…' : 'Save'}
            </motion.button>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium transition mt-1 text-text-disabled"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
