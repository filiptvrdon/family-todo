import { useState, useEffect } from 'react'

/**
 * Manages the manual dark mode toggle.
 * Dark mode is class-based (.dark on <html>) — NOT prefers-color-scheme.
 * Per design guidelines: no auto dark mode switch (reduces predictability for ADHD users).
 * 
 * Uses a two-pass approach (init from DOM on mount) to avoid hydration mismatches
 * while maintaining FOUC prevention via the script in layout.tsx.
 */
export function useTheme() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Sync state with DOM on mount to avoid hydration mismatch
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark')
    setIsDark(isDarkMode)
    setMounted(true)
  }, [])

  function toggle() {
    const next = !isDark
    setIsDark(next)
    
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return { isDark, toggle, mounted }
}
