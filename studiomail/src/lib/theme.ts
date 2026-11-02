/* ─────────────────────────────────────────────────────────────
   Thème clair / sombre / système — mémorisé, appliqué via data-theme sur
   <html>. Même mécanisme que koli-admin (lib/theme.ts), pour que
   StudioMail se comporte comme le reste du backoffice Skignas.
   applyStoredTheme() est appelé dans main.tsx avant le premier rendu.
───────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useState } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'
const KEY = 'studiomail_theme'

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
  } catch { return 'system' }
}

const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false

function apply(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && systemDark())
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function applyStoredTheme() { apply(readPref()) }

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(readPref)

  useEffect(() => {
    apply(pref)
    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])

  const setTheme = useCallback((next: ThemePref) => {
    try { localStorage.setItem(KEY, next) } catch { /* navigation privée */ }
    setPref(next)
  }, [])

  const isDark = pref === 'dark' || (pref === 'system' && systemDark())
  const toggle = useCallback(() => setTheme(isDark ? 'light' : 'dark'), [isDark, setTheme])

  return { pref, isDark, setTheme, toggle }
}
