import { useState } from 'react'

/**
 * Manages the manual dark mode toggle.
 * Dark mode is class-based (.dark on <html>) — NOT prefers-color-scheme.
 * Per design guidelines: no auto dark mode switch (reduces predictability for ADHD users).
 */
export function useTheme() {
  // Initialise from DOM so the state matches the FOUC-prevention script immediately
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return false
  })

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

  return { isDark, toggle }
}
