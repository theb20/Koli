import { useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import BlackHoleHeroSection from './BlackHoleHeroSection'

/** true sous 768 px — suit le redimensionnement sans re-rendu inutile. */
function useNarrow(): boolean {
  const query = '(max-width: 767px)'
  return useSyncExternalStore(
    cb => { const m = window.matchMedia(query); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/**
 * Bandeau d'appel à l'action de fin de page, sur le trou noir animé (WebGL).
 * Desktop : texte à gauche sur un voile, trou noir à droite. Mobile : trou
 * noir en haut, texte en bas, et calcul allégé (moins de pas par rayon,
 * résolution réduite) — le rendu est le plus coûteux de la page.
 * Sans WebGL, le fond reste simplement noir et le texte lisible.
 */
export default function BlackHoleCta() {
  const narrow = useNarrow()
  return (
    <section aria-labelledby="cta-final-title" className="bg-black text-[#f4f4f2]">
      <BlackHoleHeroSection
        className="min-h-[560px] lg:min-h-[620px]"
        focus={narrow ? [0.5, 0.3] : [0.72, 0.48]}
        distance={narrow ? 30 : 24}
        scrim={narrow ? 'bottom' : 'left'}
        scrimStrength={0.85}
        steps={narrow ? 180 : 300}
        resolution={narrow ? 0.55 : 0.7}
      >
        <div className="flex min-h-[560px] lg:min-h-[620px] items-end md:items-center px-8 lg:px-14 py-14">
          <div className="max-w-xl flex flex-col gap-5">
            <h2 id="cta-final-title" className="font-instrument-serif font-normal text-4xl sm:text-5xl lg:text-6xl leading-tight tracking-tight text-white">
              {'Prêt à développer vos ventes\u00A0?' /* espace insécable : le « ? » ne passe jamais seul à la ligne */}
            </h2>
            <p className="text-[#c8c8ce] text-base lg:text-lg">Rejoignez plus de 12 500 marchands sur Skignas.</p>
            <Link to="/inscription"
              className="self-start inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-bold text-[#111] hover:bg-[#f4f4f2] transition-colors">
              Devenir marchand
              <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
            </Link>
          </div>
        </div>
      </BlackHoleHeroSection>
    </section>
  )
}
