const OLLAMA_URL = 'http://localhost:11434/api/chat'
const MODEL = 'qwen3.5:latest'

export type OllamaMsg = { role: 'system' | 'user' | 'assistant'; content: string }

// Non-streaming JSON call — used for structured extraction tasks
export async function ollamaJSON(messages: OllamaMsg[]): Promise<string> {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, stream: false, think: false, format: 'json' }),
  })
  if (!res.ok) throw new Error(`Ollama ${res.status}`)
  const data = await res.json()
  return data.message?.content ?? ''
}

// Streaming call — returns a ReadableStream of raw text tokens
export async function ollamaStream(messages: OllamaMsg[]): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, stream: true, think: false }),
  })
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`)

  const encoder = new TextEncoder()
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read()
        if (done) {
          controller.close()
          return
        }
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const chunk = JSON.parse(line)
            const token: string = chunk.message?.content ?? ''
            if (token) controller.enqueue(encoder.encode(token))
            if (chunk.done) controller.close()
          } catch {
            // incomplete JSON line — skip
          }
        }
      } catch (err) {
        controller.error(err)
      }
    },
    cancel() {
      reader.cancel()
    },
  })
}
