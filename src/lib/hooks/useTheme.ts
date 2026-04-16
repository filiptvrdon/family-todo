import { useTheme as useNextTheme } from 'next-themes'
import { useEffect, useState } from 'react'

/**
 * Manages the manual dark mode toggle.
 * Wrapped next-themes for compatibility and to handle hydration safety.
 * Dark mode is class-based (.dark on <html>) — NOT prefers-color-scheme.
 * Per design guidelines: no auto dark mode switch (reduces predictability for ADHD users).
 */
export function useTheme() {
  const { setTheme, resolvedTheme } = useNextTheme()
  const [mounted, setMounted] = useState(false)

  // Ensure we are mounted on the client to avoid hydration mismatch when reading resolvedTheme
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const isDark = mounted ? (resolvedTheme === 'dark') : false

  function toggle() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return { isDark, toggle, mounted }
}
