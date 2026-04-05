// Client-side helper — triggers AI-generated metadata (nudges, momentum) for a task

export function triggerAiMetadata(
  taskId: string,
  callbacks?: {
    onToken: (taskId: string, token: string) => void
    onDone: (taskId: string, text: string) => void
  }
) {
  // Stream motivation nudge & momentum contribution to the card
  ;(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/ai/stream`, { method: 'POST' })
      if (!res.ok || !res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let lastVisibleLength = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const token = decoder.decode(value, { stream: true })
        fullText += token

        // Filter out [BONUS: X] from the UI stream
        const visibleText = fullText.split('[BONUS:')[0].trim()
        const newVisible = visibleText.slice(lastVisibleLength)
        
        if (newVisible) {
          callbacks?.onToken(taskId, newVisible)
          lastVisibleLength = visibleText.length
        }
      }
      const finalVisibleText = fullText.split('[BONUS:')[0].trim()
      callbacks?.onDone(taskId, finalVisibleText)
    } catch (e) {
      console.error('[ai-metadata] stream failed:', e)
      callbacks?.onDone?.(taskId, '')
    }
  })()

  // Completion nudge — async, fire-and-forget
  fetch(`/api/tasks/${taskId}/ai`, { method: 'POST' }).catch(e =>
    console.error('[ai-metadata] completion fetch failed:', e)
  )
}
