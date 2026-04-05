// Client-side helper — triggers nudge generation for a task

export function triggerNudges(
  taskId: string,
  callbacks?: {
    onToken: (taskId: string, token: string) => void
    onDone: (taskId: string, text: string) => void
  }
) {
  // Stream motivation nudge to the card
  ;(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/nudges/stream`, { method: 'POST' })
      if (!res.ok || !res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const token = decoder.decode(value, { stream: true })
        fullText += token
        callbacks?.onToken(taskId, token)
      }
      callbacks?.onDone(taskId, fullText)
    } catch (e) {
      console.error('[nudges] motivation stream failed:', e)
      callbacks?.onDone?.(taskId, '')
    }
  })()

  // Completion nudge — async, fire-and-forget
  fetch(`/api/tasks/${taskId}/nudges`, { method: 'POST' }).catch(e =>
    console.error('[nudges] completion fetch failed:', e)
  )
}
