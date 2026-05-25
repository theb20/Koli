import { Link } from 'react-router-dom'
import { Truck, ShieldCheck, Headphones, ArrowRight } from 'lucide-react'

/* ── Data ── */
const CATEGORIES = [
  {
    label: 'High-Tech',
    href: '/catalogue',
    bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    url: '/flyers/1.png',
    dark: false,
  },
  {
    label: 'Maison & Décoration',
    href: '/catalogue',
    bg: 'linear-gradient(135deg, #f5ebe0 0%, #e3d5ca 50%, #d5bdaf 100%)',
    url: '/flyers/1.png',
    dark: false,
  },
  {
    label: 'Beauté & Soins',
    href: '/catalogue',
    bg: 'linear-gradient(135deg, #f8e8ee 0%, #fce4ec 50%, #f48fb1 100%)',
    url: '/flyers/1.png',
    dark: false,
  },
  {
    label: 'Sport & Fitness',
    href: '/catalogue',
    bg: 'linear-gradient(135deg, #1b1b1b 0%, #2d2d2d 50%, #3d3d3d 100%)',
    url: '/flyers/1.png',
    dark: false,
  },
]
const TRUST = [
  { icon: <Truck size={20} />,        title: 'Livraison rapide',   sub: '2 à 7 jours ouvrés' },
  { icon: <ShieldCheck size={20} />,  title: 'Produits de qualité', sub: 'Sélectionnés pour vous' },
  { icon: <Headphones size={20} />,   title: 'Support 7j/7',       sub: 'Réponse rapide' },
]

/* ── Component ── */
export function DropShopSection() {
  return (
    <section style={{ background: '#ffffffff' }} className="py-3 mt-0">
      <div className="mx-auto px-4 md:px-8 flex flex-col gap-6">

        {/* ── Top row: Hero + Categories ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Hero card */}
          <div className="relative rounded-2xl overflow-hidden flex flex-col min-h-[320px] sm:min-h-[420px] lg:min-h-[500px]">

            {/* Background image */}
            <img
              src="/flyers/1.png"
              alt="produits tendance"
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Light overlay so text stays readable */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(160deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0) 45%, rgba(255,255,255,0.10) 100%)' }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col px-5 sm:px-8 flex-1">

              {/* Bloc texte centré verticalement */}
              <div className="flex flex-col items-start text-left flex-1 justify-center">
                {/* Badge */}
                <span className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#b57a3d' }}>
                  Nouveautés
                </span>

                {/* Headline */}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl text-gray-900 mb-3">
                  Produits tendance<br/> Livrés chez vous
                </h1>

                {/* Sub */}
                <p className="text-gray-600 text-sm leading-relaxed mb-6 max-w-xs">
                  Découvrez notre sélection de produits gagnants à prix mini.
                </p>

                {/* CTA */}
                <Link
                  to="/catalogue"
                  className="inline-flex items-center gap-2 bg-blue-700 text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-gray-900 transition-colors"
                >
                  Découvrir la boutique <ArrowRight size={16} />
                </Link>
              </div>

              {/* Trust badges — bas de carte */}
              <div className="self-stretch sm:self-start mb-6 bg-white rounded-xl shadow-md grid grid-cols-3 w-full sm:w-auto sm:min-w-[320px]">
                {TRUST.map(({ icon, title, sub }) => (
                  <div key={title} className="flex items-center justify-center gap-2 px-4 py-3">
                    <span className="text-gray-500 shrink-0">{icon}</span>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-gray-800 leading-tight">{title}</p>
                      <p className="text-[11px] text-gray-400 leading-tight">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            
          </div>

          {/* 2×2 Category grid */}
          <div className="grid grid-cols-2 gap-4">
            {CATEGORIES.map(({ label, href, bg, url, dark = true }) => (
              <Link
                key={label}
                to={href}
                className="group relative rounded-2xl overflow-hidden flex flex-col justify-end"
                style={{ background: bg, minHeight: 140 }}
              >

                 {/* Background image */}
                  <img
                    src={url}
                    alt="produits tendance"
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                {/* Label */}
                <div className="relative z-10 p-4" style={{ background: 'linear-gradient(to left, rgba(0, 0, 0, 0) 0%, rgba(255, 255, 255, 1) 100%)' }}>
                  <p className={`font-bold text-sm leading-tight ${dark ? 'text-white' : 'text-gray-800'}`}>
                    {label}
                  </p>
                  <p className={`text-xs flex items-center gap-1 mt-0.5 group-hover:gap-2 transition-all ${dark ? 'text-white/60' : 'text-gray-500'}`}>
                    Voir plus <ArrowRight size={11} />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

       

      </div>
    </section>
  )
}
