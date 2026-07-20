import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'payment_notice_seen'
const EXPIRY_MS = 24 * 60 * 60 * 1000
const SHOW_DELAY_MS = 600

type StoredNotice = { seenAt: number }

function hasRecentlyBeenSeen(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as StoredNotice
    return Date.now() - parsed.seenAt < EXPIRY_MS
  } catch {
    return false
  }
}

/**
 * Popup d'information "paiement en cours d'intégration" — s'affiche une fois
 * par fenêtre de 24h (LocalStorage), avec un léger délai d'apparition pour ne
 * pas interrompre le premier rendu de la page.
 */
export function usePaymentNotice() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (hasRecentlyBeenSeen()) return
    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ seenAt: Date.now() } satisfies StoredNotice))
    setOpen(false)
  }, [])

  return { open, dismiss }
}
