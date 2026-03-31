'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send } from 'lucide-react'
import { format } from 'date-fns'

type Message = { role: 'user' | 'assistant'; content: string }
type OverdueTodo = { id: string; title: string; due_date: string }
type PendingTodo = { title: string; due_date: string | null }

interface Props {
  userName: string
  overdueTodos: OverdueTodo[]
  pendingTodos: PendingTodo[]
  onDone: () => void
}

const CHECKIN_KEY = 'checkin_last_date'

export function hasCheckedInToday(): boolean {
  try {
    return localStorage.getItem(CHECKIN_KEY) === format(new Date(), 'yyyy-MM-dd')
  } catch {
    return false
  }
}

export function markCheckedIn(): void {
  try {
    localStorage.setItem(CHECKIN_KEY, format(new Date(), 'yyyy-MM-dd'))
  } catch {}
}

// Reads a streaming plain-text response, calling onToken for each chunk.
async function readStream(res: Response, onToken: (t: string) => void): Promise<void> {
  if (!res.body) throw new Error('No response body')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    onToken(decoder.decode(value, { stream: true }))
  }
}

export default function CheckIn({ userName, overdueTodos, pendingTodos, onDone }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  // waiting = true while no tokens have arrived yet (show dots)
  // responding = true while tokens are streaming (disable input)
  const [waiting, setWaiting] = useState(true)
  const [responding, setResponding] = useState(false)
  const [userMessageCount, setUserMessageCount] = useState(0)
  const [wrappingUp, setWrappingUp] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // AbortController ensures that when React Strict Mode re-runs this effect (or the
  // component unmounts mid-stream), the first fetch is cancelled before the second starts.
  useEffect(() => {
    const controller = new AbortController()

    async function run() {
      setWaiting(true)
      setResponding(true)
      setMessages([{ role: 'assistant', content: '' }])
      try {
        const res = await fetch('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'greet', userName, pendingTodos }),
          signal: controller.signal,
        })
        await readStream(res, (token) => {
          if (controller.signal.aborted) return
          setWaiting(false)
          setMessages(([msg]) => [{ ...msg, content: msg.content + token }])
        })
      } catch (e) {
        if (controller.signal.aborted) return
        setMessages([{ role: 'assistant', content: `Hey ${userName}! What's on your mind today?` }])
      } finally {
        if (!controller.signal.aborted) {
          setWaiting(false)
          setResponding(false)
          inputRef.current?.focus()
        }
      }
    }

    run()
    return () => controller.abort()
  }, [userName])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, waiting])

  async function sendMessage() {
    if (!input.trim() || waiting || responding || wrappingUp) return

    const text = input.trim()
    setInput('')

    const isFirstUserMessage = userMessageCount === 0
    setUserMessageCount((n) => n + 1)

    const history: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(history)

    setWaiting(true)
    setResponding(true)

    // Append empty placeholder for the incoming reply
    const withPlaceholder: Message[] = [...history, { role: 'assistant', content: '' }]
    setMessages(withPlaceholder)

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          messages: history,
          userName,
          overdueTodos,
          pendingTodos,
          isFirstUserMessage,
        }),
      })
      await readStream(res, (token) => {
        setWaiting(false)
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          updated[updated.length - 1] = { ...last, content: last.content + token }
          return updated
        })
      })
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Something went wrong — try again?',
        }
        return updated
      })
    } finally {
      setWaiting(false)
      setResponding(false)
      inputRef.current?.focus()
    }
  }

  async function handleWrapUp() {
    setWrappingUp(true)
    try {
      await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finalize', messages, overdueTodos }),
      })
    } finally {
      markCheckedIn()
      onDone()
    }
  }

  function handleDismiss() {
    markCheckedIn()
    onDone()
  }

  const isBusy = waiting || responding || wrappingUp
  const canWrapUp = userMessageCount >= 1 && !isBusy

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(26,26,46,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full flex flex-col"
        style={{
          maxWidth: '440px',
          maxHeight: '88vh',
          background: 'var(--background)',
          borderRadius: '20px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 48px rgba(0,181,200,0.14)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Daily check-in
          </span>
          <button
            onClick={handleDismiss}
            className="w-7 h-7 flex items-center justify-center rounded-full transition"
            style={{ background: 'var(--color-foam)', color: 'var(--color-text-secondary)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 min-h-0">
          {messages.map((msg, i) => {
            const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1
            const showDots = isLastAssistant && waiting && msg.content === ''

            return (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {showDots ? (
                  <div
                    className="flex gap-1 items-center"
                    style={{
                      padding: '12px 16px',
                      borderRadius: '18px 18px 18px 4px',
                      background: '#fff',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {[0, 1, 2].map((j) => (
                      <span
                        key={j}
                        className="block w-1.5 h-1.5 rounded-full"
                        style={{
                          background: 'var(--color-text-disabled)',
                          animation: `checkin-bounce 1.2s ease-in-out ${j * 0.15}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      maxWidth: '85%',
                      padding: '10px 16px',
                      borderRadius:
                        msg.role === 'user'
                          ? '18px 18px 4px 18px'
                          : '18px 18px 18px 4px',
                      ...(msg.role === 'user'
                        ? { background: 'var(--color-primary)', color: '#fff' }
                        : {
                            background: '#fff',
                            color: 'var(--color-text)',
                            border: '1px solid var(--color-border)',
                          }),
                    }}
                  >
                    {msg.content}
                  </p>
                )}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Wrap up */}
        {canWrapUp && (
          <div className="px-5 pt-1 pb-2 shrink-0">
            <button
              onClick={handleWrapUp}
              className="w-full text-sm font-medium rounded-xl transition"
              style={{
                background: 'var(--color-foam)',
                color: 'var(--color-primary)',
                minHeight: '40px',
                border: '1px solid var(--color-border)',
              }}
            >
              All done — wrap up ✓
            </button>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
          className="flex items-center gap-2 px-4 py-3 shrink-0"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={userMessageCount === 0 ? "What's on your mind…" : 'Reply…'}
            disabled={isBusy}
            className="flex-1 text-sm rounded-xl px-4 focus:outline-none"
            style={{
              background: '#fff',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-text)',
              minHeight: '44px',
              opacity: isBusy ? 0.5 : 1,
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isBusy}
            className="shrink-0 flex items-center justify-center rounded-xl transition"
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              width: '44px',
              height: '44px',
              opacity: !input.trim() || isBusy ? 0.35 : 1,
            }}
          >
            <Send size={15} />
          </button>
        </form>
      </div>

      <style>{`
        @keyframes checkin-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}
