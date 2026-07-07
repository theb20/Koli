import { useEffect, useState } from 'react'

/* ─────────────────────────────────────────
   PAGE LOADER
   Fidèle au design original :
   • anneau rotatif avec box-shadow glow
   • lettres qui rebondissent en cascade
   Le CSS est dans index.css (.loader-wrapper,
   .loader, .loader-letter, etc.)
───────────────────────────────────────── */

const LETTERS = ['S', 'k', 'i', 'g', 'n', 'a', 's', '']

interface PageLoaderProps {
  /** Durée d'affichage en ms avant fade-out automatique */
  duration?: number
}

export function PageLoader({ duration = 2400 }: PageLoaderProps) {
  const [visible, setVisible] = useState(true)
  const [hiding, setHiding] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setHiding(true), duration)
    const removeTimer = setTimeout(() => setVisible(false), duration + 520)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [duration])

  if (!visible) return null

  return (
    <div className={`page-loader-overlay${hiding ? ' hide' : ''}`}>
      <div className="loader-wrapper">
        {LETTERS.map((char, i) => (
          <span key={i} className="loader-letter">
            {char}
          </span>
        ))}
        <div className="loader" />
      </div>
    </div>
  )
}

export default PageLoader
