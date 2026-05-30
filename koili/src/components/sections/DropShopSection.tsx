import { Link } from 'react-router-dom'
import { Truck, ShieldCheck, Headphones, ArrowRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchCategories } from '../../lib/api'

/* ── Gradients de fallback par position ── */
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'linear-gradient(135deg, #f5ebe0 0%, #e3d5ca 50%, #d5bdaf 100%)',
  'linear-gradient(135deg, #f8e8ee 0%, #fce4ec 50%, #f48fb1 100%)',
  'linear-gradient(135deg, #1b1b1b 0%, #2d2d2d 50%, #3d3d3d 100%)',
]

const TRUST = [
  { icon: <Truck size={20} />,        title: 'Livraison rapide',    sub: '2 à 7 jours ouvrés'  },
  { icon: <ShieldCheck size={20} />,  title: 'Produits de qualité', sub: 'Sélectionnés pour vous' },
  { icon: <Headphones size={20} />,   title: 'Support 7j/7',        sub: 'Réponse rapide'       },
]

/* ── Component ── */
export function DropShopSection() {
  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn:  fetchCategories,
    staleTime: 300_000,
  })

  // 4 premières catégories actives, triées par position
  const categories = (catData?.data ?? [])
    .filter(c => c.isActive)
    .sort((a, b) => a.position - b.position)
    .slice(0, 4)

  return (
    <section style={{ background: '#ffffffff' }} className="py-3 mt-0">
      <div className="mx-auto px-4 md:px-8 flex flex-col gap-6">

        {/* ── Top row: Hero + Categories ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Hero card */}
          <div className="relative rounded-2xl overflow-hidden flex flex-col min-h-[320px] sm:min-h-[420px] lg:min-h-[500px]">
            <img
              src="/flyers/1.png"
              alt="produits tendance"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0) 45%, rgba(255,255,255,0.10) 100%)' }}
            />

            <div className="relative z-10 flex flex-col px-5 sm:px-8 flex-1">
              <div className="flex flex-col items-start text-left flex-1 justify-center">
                <span className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#b57a3d' }}>
                  Nouveautés
                </span>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl text-gray-900 mb-3">
                  Produits tendance<br /> Livrés chez vous
                </h1>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 max-w-xs">
                  Découvrez notre sélection de produits gagnants à prix mini.
                </p>
                <Link
                  to="/catalogue"
                  className="inline-flex items-center gap-2 bg-blue-700 text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-gray-900 transition-colors"
                >
                  Découvrir la boutique <ArrowRight size={16} />
                </Link>
              </div>

              {/* Trust badges */}
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

          {/* 2×2 Category grid — données réelles */}
          <div className="grid grid-cols-2 gap-4">
            {categories.length > 0
              ? categories.map((cat, i) => (
                <Link
                  key={cat.id}
                  to={`/catalogue?category=${cat.slug}`}
                  className="group relative rounded-2xl overflow-hidden flex flex-col justify-end"
                  style={{
                    background: cat.image ? 'transparent' : FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length],
                    minHeight: 140,
                  }}
                >
                  {/* Image de fond */}
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    /* Placeholder flyer si pas d'image */
                    <img
                      src="/flyers/1.png"
                      alt={cat.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-40"
                    />
                  )}

                  {/* Dégradé + label */}
                  <div className="relative z-10 p-4" style={{ background: 'linear-gradient(to left, rgba(0,0,0,0) 0%, rgba(255,255,255,1) 100%)' }}>
                    <p className="font-bold text-sm leading-tight text-gray-800">
                      {cat.icon && <span className="mr-1">{cat.icon}</span>}
                      {cat.name}
                    </p>
                    <p className="text-xs flex items-center gap-1 mt-0.5 text-gray-500 group-hover:gap-2 transition-all">
                      Voir plus <ArrowRight size={11} />
                    </p>
                  </div>

                  {/* Badge tag optionnel */}
                  {cat.tag && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold bg-white/90 text-gray-700 px-2 py-0.5 rounded-full shadow-sm">
                      {cat.tag}
                    </span>
                  )}
                </Link>
              ))
              : /* Skeleton pendant le chargement */
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-gray-100 animate-pulse"
                    style={{ minHeight: 140 }}
                  />
                ))
            }
          </div>
        </div>
      </div>
    </section>
  )
}
