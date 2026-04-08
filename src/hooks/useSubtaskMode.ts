import { useState, useEffect } from 'react'

export function useSubtaskMode() {
  const [modifierPressed, setModifierPressed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CTRL on Windows/Linux, CMD on Mac
      if (e.ctrlKey || e.metaKey) {
        setModifierPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Only release if both modifiers are up
      if (!e.ctrlKey && !e.metaKey) {
        setModifierPressed(false)
      }
    }

    // Check for mobile on mount and window resize
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches)
    }

    checkMobile()
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  return {
    isSubtaskMode: modifierPressed && !isMobile,
    isMobile
  }
}
