import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BlurText from '../ui/BlurText'
import TrueFocus from '../ui/TrueFocus'
import Aurora from '../ui/Aurora'
import LogoLoop from '../ui/LogoLoop'

/** Vidéo de fond décorative — coûteuse en bande passante, désactivée sur mobile
 *  et différée après le premier rendu pour ne pas pénaliser le LCP. */
function useBackgroundVideoEnabled() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    if (isMobile || saveData) return
    const id = window.requestIdleCallback?.(() => setEnabled(true)) ?? window.setTimeout(() => setEnabled(true), 300)
    return () => { window.cancelIdleCallback?.(id as number); window.clearTimeout(id as number) }
  }, [])
  return enabled
}

const partnerLogos = [
  // Icônes react-icons — format { node, title }
  // { node: <SiFigma />,       title: 'Figma' },
  // Images — format { src, alt, href? }
  // { src: '/logos/mon-logo.png', alt: 'Mon Logo', href: 'https://exemple.com' },
  { src: '/icons/fnac.png', alt: 'logo fnac' },
  { src: '/icons/amazon.png', alt: 'logo amazon' },
  { src: '/icons/darty.png', alt: 'logo darty' },
  { src: '/icons/imou.png', alt: 'logo imou' },
  { src: '/icons/alibaba.png', alt: 'logo alibaba' },
  { src: '/icons/aliexpress.png', alt: 'logo aliexpress' },
  { src: '/icons/banggood.png', alt: 'logo banggood' },
  { src: '/icons/jd.com.png', alt: 'logo jd.com' }
]

export function PackifyHero() {
  const videoEnabled = useBackgroundVideoEnabled()

  return (
    <section
      className="relative overflow-hidden min-h-[80vh] sm:min-h-[90vh] flex flex-col justify-center"
      style={{ background: '#000000ff' }}
    >
      {/* Video background — desktop uniquement, montée après le premier rendu (perf mobile / LCP) */}
      {videoEnabled && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
        >
          <source src="/vds/1.webm" type="video/webm" />
          <source src="/vds/1.mp4" type="video/mp4" />
        </video>
      )}

      {/* Aurora full background */}
      <div className="absolute inset-0 pointer-events-none">
        <Aurora
          colorStops={['#3503ff0e', '#23f77f0e', '#7f0fff']}
          amplitude={1.2}
          blend={0.4}
          speed={0.4}
        />
      </div>

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-0">

        {/* Badge */}
        <div className="inline-flex items-center gap-3 mb-6 sm:mb-10 border border-white/10 rounded-full overflow-hidden">
          <Link to="/login" className="hover:scale-110 transition-transform duration-300 bg-blue-600 text-white text-xs font-bold tracking-widest px-4 py-2">
            Se connecter
          </Link>
          <Link to="/register" className="hover:scale-110 transition-transform duration-300 text-center text-white/70 text-sm pr-4">
            S'inscrire &nbsp;→
          </Link>
        </div>

        {/* Headline */}
        <div style={{ fontSize: 'clamp(26px, 5vw, 108px)', fontWeight: 400 }}>
          <BlurText
            as="h1"
            text="La tech que vous cherchez, réunie en un seul endroit."
            delay={120}
            animateBy="words"
            direction="top"
            className="text-white leading-[1.05] tracking-tight"
          />
        </div>

        {/* Subtitle */}
        <div className="mt-8 max-w-xl">
          <TrueFocus
            sentence="Skignas rassemble vos marques tech préférées en une seule expérience d'achat."
            manualMode={false}
            blurAmount={5}
            borderColor="#000dffff"
            animationDuration={0.5}
            pauseBetweenAnimations={1}
            className="text-white/50 text-sm sm:text-lg mb-9 leading-relaxed"
          />
        </div>

        {/* CTA 
        <div className="mt-10 mb-16 flex ">
          <SearchBar />
        </div>*/}

        {/* Logo loop */}
        <div className="mb-10 sm:mb-16 relative h-[90px] sm:h-[150px]">
          <p className="text-white/30 text-xs uppercase tracking-widest mb-4 sm:mb-5">Magasin Compatible</p>
          <div className="text-white/90 absolute bottom-0 left-0 right-0 flex justify-center items-center">
            <LogoLoop
              logos={partnerLogos}
              speed={80}
              direction="left"
              logoHeight={44}
              gap={28}
              hoverSpeed={20}
              scaleOnHover
              fadeOut
              fadeOutColor="#0d0d14"
              ariaLabel="Partenaires et intégrations"
            />
          </div>
        </div>

        {/* BorderGlow card 
        <BorderGlow
          edgeSensitivity={30}
          glowColor="40 80 80"
          backgroundColor="#120F17"
          borderRadius={28}
          glowRadius={40}
          glowIntensity={1}
          coneSpread={25}
          animated={false}
          colors={['#c084fc', '#f472b6', '#38bdf8']}
        >
          <div className="p-8">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">Plateforme</p>
            <h2 className="text-white text-2xl font-semibold mb-2">
              Conçu pour aller vite
            </h2>
            <p className="text-white/50 text-sm leading-relaxed max-w-md">
              Décrivez votre emballage en langage naturel, notre IA génère le design en quelques secondes.
            </p>
          </div>
        </BorderGlow>
        */}
      </div>
    </section>
  )
}
