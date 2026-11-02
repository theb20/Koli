import { useEffect, useState } from 'react'
import { ArrowUp, MessageCircle, Star } from 'lucide-react'
import { useSiteSettings, waLink } from '../../hooks/useSiteSettings'

export function FloatingActions({ onReviewsClick }: { onReviewsClick: () => void }) {
  const settings = useSiteSettings()
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="hidden lg:flex flex-col gap-2 fixed right-5 top-1/2 -translate-y-1/2 z-20">
      <a
        href={waLink(settings.whatsappNumber, 'Bonjour, j\'ai une question sur un produit.')}
        target="_blank"
        rel="noopener noreferrer"
        className="w-[76px] flex flex-col items-center gap-1 py-3 rounded-xl bg-surface shadow-md hover:shadow-lg transition-shadow"
      >
        <MessageCircle size={18} className="text-ink" />
        <span className="text-[11px] text-ink text-center leading-tight">Service client</span>
      </a>

      <button
        onClick={onReviewsClick}
        className="w-[76px] flex flex-col items-center gap-1 py-3 rounded-xl bg-surface shadow-md hover:shadow-lg transition-shadow"
      >
        <Star size={18} className="text-ink" />
        <span className="text-[11px] text-ink text-center leading-tight">Avis</span>
      </button>

      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-[76px] flex flex-col items-center gap-1 py-3 rounded-xl bg-surface shadow-md hover:shadow-lg transition-shadow"
        >
          <ArrowUp size={18} className="text-ink" />
          <span className="text-[11px] text-ink text-center leading-tight">Haut</span>
        </button>
      )}
    </div>
  )
}
