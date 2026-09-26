import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { GOTO_SHORTCUTS } from '../lib/navigation'

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

/** ⌘K / Ctrl+K, « ? », et « G puis lettre » (1,2 s pour la 2e touche). */
export function useGlobalShortcuts({ onPalette, onShortcuts }: { onPalette: () => void; onShortcuts: () => void }) {
  const navigate = useNavigate()
  const gPressedAt = useRef(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); onPalette(); return }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      if (document.querySelector('[role="dialog"],[role="alertdialog"]')) return
      if (e.key === '?') { e.preventDefault(); onShortcuts(); return }
      const k = e.key.toLowerCase()
      if (k === 'g') { gPressedAt.current = Date.now(); return }
      if (Date.now() - gPressedAt.current < 1200 && GOTO_SHORTCUTS[k]) {
        e.preventDefault(); gPressedAt.current = 0; navigate(GOTO_SHORTCUTS[k])
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [navigate, onPalette, onShortcuts])
}
