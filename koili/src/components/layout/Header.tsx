import { Link, NavLink } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Menu, X, ChevronDown, ChevronRight, ShoppingCart,
  User, Package, Bell, Phone, Mail, Moon, Sun,
  Zap, AlignJustify, HelpCircle, MapPin, Search,
} from 'lucide-react'
import SearchBar from '../ui/Search'

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
type NavChild = {
  label: string
  href: string
  description?: string
  image?: string
  tag?: string
}
type NavItem = {
  label: string
  href: string
  mega?: boolean
  children?: NavChild[]
}

const GREEN = '#0421ffff'

/* ─────────────────────────────────────────
   DATA
───────────────────────────────────────── */
const CATEGORIES_DROPDOWN = [
  { label: 'High-Tech',          icon: '📱', href: '/catalogue?cat=hightech'  },
  { label: 'Maison & Décoration',icon: '🏠', href: '/catalogue?cat=maison'    },
  { label: 'Beauté & Soins',     icon: '✨', href: '/catalogue?cat=beaute'    },
  { label: 'Sport & Fitness',    icon: '💪', href: '/catalogue?cat=sport'     },
  { label: 'Mode & Accessoires', icon: '👗', href: '/catalogue?cat=mode'      },
  { label: 'Jeux & Loisirs',     icon: '🎮', href: '/catalogue?cat=jeux'      },
]

const MEGA_CATEGORIES: NavChild[] = [
  { label: 'High-Tech',          href: '/catalogue?cat=hightech', description: 'Gadgets, audio & accessoires',     image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=600', tag: 'Populaire' },
  { label: 'Maison & Décoration',href: '/catalogue?cat=maison',   description: 'Décoration moderne & lifestyle',   image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=600' },
  { label: 'Beauté & Soins',     href: '/catalogue?cat=beaute',   description: 'Skincare & accessoires beauté',    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=600', tag: 'Tendance' },
  { label: 'Sport & Fitness',    href: '/catalogue?cat=sport',    description: 'Performance & récupération',       image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=600' },
  { label: 'Mode & Accessoires', href: '/catalogue?cat=mode',     description: 'Styles contemporains',             image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=600' },
  { label: 'Jeux & Loisirs',     href: '/catalogue?cat=jeux',     description: 'Gaming, jouets & créativité',      image: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=600' },
]

const TRENDING_TAGS = ['Montres connectées', 'LED RGB', 'Skincare', 'Pistolet massage', 'Lampe bureau']

const NAV_LINKS: NavItem[] = [
  { label: 'Accueil',    href: '/'          },
  { label: 'Catalogue',  href: '/catalogue', mega: true, children: MEGA_CATEGORIES },
  { label: 'Nouveautés', href: '/new'        },
  { label: 'Tendances',  href: '/trending'   },
  { label: 'Contact',    href: '/contact'    },
]

/* ─────────────────────────────────────────
   TOP INFO BAR (masquée sur mobile)
───────────────────────────────────────── */
function TopBar() {
  const [dark, setDark] = useState(false)
  return (
    <div className="bg-gray-900 text-white text-xs hidden sm:block">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-9 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <a href="tel:+2250141000012" className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors whitespace-nowrap">
            <Phone size={12} /> +225 01 41 00 00 12
          </a>
          <span className="text-gray-600 hidden md:block">|</span>
          <a href="mailto:service.client@koli.com" className="hidden md:flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors">
            <Mail size={12} /> service.client@koli.com
          </a>
          <span className="text-gray-600 hidden lg:block">|</span>
          <span className="text-gray-400 hidden lg:block">Livraison partout en Côte d&apos;Ivoire</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/suivi" className="hidden md:flex items-center gap-1 text-gray-300 hover:text-white transition-colors">
            <MapPin size={12} /> Suivre ma commande
          </Link>
          <span className="text-gray-600 hidden md:block">|</span>
          <Link to="/aide" className="hidden md:flex items-center gap-1 text-gray-300 hover:text-white transition-colors">
            <HelpCircle size={12} /> Aide
          </Link>
          <span className="text-gray-600">|</span>
          <span className="text-gray-300">FR · CFA</span>
          <button onClick={() => setDark(d => !d)} className="text-gray-300 hover:text-white transition-colors">
            {dark ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   ACTION ICONS (desktop)
───────────────────────────────────────── */
function ActionIcon({ icon, label, sublabel, badge, href }: {
  icon: React.ReactNode; label: string; sublabel: string; badge?: number; href: string
}) {
  return (
    <Link to={href} className="flex items-center gap-2.5 group shrink-0">
      <div className="relative">
        <div className="text-gray-500 group-hover:text-gray-900 transition-colors">{icon}</div>
        {badge !== undefined && (
          <span style={{ background: GREEN }}
            className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1">
            {badge}
          </span>
        )}
      </div>
      <div className="hidden lg:block">
        <p className="text-[11px] text-gray-400 leading-none">{label}</p>
        <p className="text-sm font-semibold text-gray-800 leading-tight">{sublabel}</p>
      </div>
    </Link>
  )
}

/* ─────────────────────────────────────────
   MEGA MENU (desktop)
───────────────────────────────────────── */
function FullMegaMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const active = MEGA_CATEGORIES[activeIdx] ?? MEGA_CATEGORIES[0]

  return (
    <div
      className={`
        absolute left-0 top-12 right-0 z-50
        bg-white border-b border-gray-200
        transition-all duration-200 origin-top overflow-hidden
        ${open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'}
      `}
      style={{ boxShadow: '0 16px 40px -8px rgba(0,0,0,0.08)' }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-12 min-h-[440px]">

          {/* Gauche */}
          <div className="col-span-5 border-r border-gray-100 py-6 px-8">
            <div className="flex items-baseline justify-between mb-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Catalogue</p>
                <h3 className="text-base font-semibold text-gray-900 mt-0.5">Parcourir par catégorie</h3>
              </div>
              <span className="text-[11px] text-gray-400 font-mono">{MEGA_CATEGORIES.length} sections</span>
            </div>
            <div className="space-y-0.5">
              {MEGA_CATEGORIES.map((cat, i) => {
                const isActive = activeIdx === i
                return (
                  <Link key={cat.href} to={cat.href} onClick={onClose}
                    onMouseEnter={() => setActiveIdx(i)} onFocus={() => setActiveIdx(i)}
                    className={`group flex items-center gap-3 px-3 py-3 rounded-lg transition-colors duration-150 ${isActive ? 'bg-gray-50' : 'hover:bg-gray-50/60'}`}
                  >
                    <span className={`text-[10px] font-mono w-6 tabular-nums ${isActive ? 'text-gray-900' : 'text-gray-300'}`}>{String(i + 1).padStart(2, '0')}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>{cat.label}</span>
                        {cat.tag && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider" style={{ background: `${GREEN}15`, color: GREEN }}>{cat.tag}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{cat.description}</p>
                    </div>
                    <span className={`text-gray-300 transition-all ${isActive ? 'opacity-100 text-gray-900' : 'opacity-0 -translate-x-2'}`}>→</span>
                  </Link>
                )
              })}
            </div>
            <Link to="/catalogue" onClick={onClose}
              className="mt-6 flex items-center justify-between px-3 py-3 rounded-lg border border-gray-200 hover:border-gray-900 hover:bg-gray-900 hover:text-white text-sm font-medium text-gray-700 transition-all group">
              <span>Voir l'ensemble du catalogue</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

          {/* Droite */}
          <div className="col-span-7 bg-gray-50/40 py-6 px-8 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Aperçu · {active.label}</p>
              <Link to={active.href} onClick={onClose} className="text-xs font-medium text-gray-900 hover:underline underline-offset-4 decoration-2" style={{ textDecorationColor: GREEN }}>Tout voir →</Link>
            </div>
            <Link to={active.href} onClick={onClose} className="relative block rounded-xl overflow-hidden group mb-5" style={{ aspectRatio: '16/7' }}>
              <img src={active.image} alt={active.label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" key={active.href} />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <p className="text-white/70 text-[10px] font-semibold uppercase tracking-[0.18em] mb-1">Catégorie</p>
                <h4 className="text-white text-2xl font-semibold leading-tight">{active.label}</h4>
                <p className="text-white/80 text-sm mt-1 max-w-md">{active.description}</p>
              </div>
            </Link>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 mb-2">Sélections</p>
                {[{ label: 'Nouveautés', meta: '24' }, { label: 'Meilleures ventes', meta: '48' }, { label: 'En promotion', meta: '-30%', accent: true }].map(item => (
                  <Link key={item.label} to={active.href} onClick={onClose} className="flex items-center justify-between py-2 border-b border-gray-100 hover:border-gray-300 transition-colors group">
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 group-hover:translate-x-0.5 transition-all">{item.label}</span>
                    <span className={`text-xs font-mono ${item.accent ? 'font-bold' : 'text-gray-400'}`} style={item.accent ? { color: GREEN } : {}}>{item.meta}</span>
                  </Link>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 mb-2">Ressources</p>
                {[{ label: "Guide d'achat", meta: 'PDF' }, { label: 'Comparateur', meta: 'Outil' }, { label: 'Avis clients', meta: '4.7★' }].map(item => (
                  <Link key={item.label} to="/catalogue" onClick={onClose} className="flex items-center justify-between py-2 border-b border-gray-100 hover:border-gray-300 transition-colors group">
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 group-hover:translate-x-0.5 transition-all">{item.label}</span>
                    <span className="text-xs font-mono text-gray-400">{item.meta}</span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="mt-auto flex items-center justify-between p-4 rounded-xl bg-gray-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm" style={{ background: GREEN }}>%</div>
                <div>
                  <p className="text-sm font-semibold leading-tight">Offre du moment</p>
                  <p className="text-xs text-white/60">Jusqu'à -50% sur la High-Tech</p>
                </div>
              </div>
              <Link to="/catalogue?cat=hightech" onClick={onClose} className="text-xs font-semibold px-4 py-2 rounded-lg bg-white text-gray-900 hover:bg-gray-100 transition-colors">Découvrir →</Link>
            </div>
          </div>
        </div>

        {/* Tendances */}
        <div className="border-t border-gray-100 px-8 py-3 flex items-center gap-4 bg-white">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 shrink-0">Recherches populaires</span>
          <div className="flex items-center gap-1 overflow-x-auto">
            {TRENDING_TAGS.map(tag => (
              <Link key={tag} to={`/catalogue?q=${encodeURIComponent(tag)}`} onClick={onClose}
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors whitespace-nowrap">
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   SIMPLE NAV LINK (desktop)
───────────────────────────────────────── */
function SimpleNavLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.href}
      className={({ isActive }) => `text-sm font-medium transition-colors ${isActive ? '' : 'text-gray-600 hover:text-black'}`}
      style={({ isActive }) => isActive ? { color: GREEN } : {}}
    >
      {item.label}
    </NavLink>
  )
}

/* ─────────────────────────────────────────
   CATEGORIES BUTTON (desktop)
───────────────────────────────────────── */
function CategoriesBtn() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-gray-800 text-sm font-semibold text-gray-800 hover:bg-gray-800 hover:text-white transition-all"
      >
        <AlignJustify size={15} />
        Explorer
        <ChevronRight size={13} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 z-50">
          {CATEGORIES_DROPDOWN.map(cat => (
            <Link key={cat.href} to={cat.href} onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition-colors">
              <span>{cat.icon}</span><span>{cat.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   MOBILE MENU — pro light
───────────────────────────────────────── */
function MobileOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [searchVal, setSearchVal] = useState('')

  useEffect(() => { if (!open) setSearchVal('') }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Fond semi-transparent derrière */}
          <motion.div
            key="overlay-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-30 bg-black/25 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Panel principal */}
          <motion.div
            key="overlay-panel"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden fixed inset-x-0 top-[60px] z-40 bg-white overflow-y-auto overscroll-contain"
            style={{
              maxHeight: 'calc(100dvh - 60px)',
              boxShadow: '0 24px 60px -12px rgba(0,0,0,0.18)',
            }}
          >

            {/* ── Recherche ── */}
            <div className="px-5 pt-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Search size={15} className="text-gray-400 shrink-0" />
                <input
                  value={searchVal}
                  onChange={e => setSearchVal(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="bg-transparent text-sm text-gray-800 outline-none flex-1 placeholder:text-gray-400 min-w-0"
                />
                {searchVal && (
                  <button onClick={() => setSearchVal('')}
                    className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors">
                    <X size={11} className="text-gray-500" />
                  </button>
                )}
              </div>
            </div>

            {/* ── Navigation ── */}
            <div className="px-4 py-2">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-400 px-2 pt-3 pb-2">
                Navigation
              </p>
              <nav>
                {NAV_LINKS.map((item, i) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <NavLink
                      to={item.href}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `group relative flex items-center justify-between px-3 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                          isActive
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {/* Barre active */}
                          {isActive && (
                            <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-blue-500" />
                          )}
                          <span className="pl-1">{item.label}</span>
                          <ChevronRight
                            size={15}
                            className={`transition-all ${isActive ? 'text-blue-400' : 'text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5'}`}
                          />
                        </>
                      )}
                    </NavLink>
                  </motion.div>
                ))}
              </nav>
            </div>

            {/* ── Catégories ── */}
            <div className="px-4 pt-1 pb-4 border-t border-gray-100 mt-2">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-400 px-2 pt-3 pb-3">
                Catégories
              </p>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES_DROPDOWN.map((cat, i) => (
                  <motion.div
                    key={cat.href}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 + i * 0.04, duration: 0.28 }}
                  >
                    <Link
                      to={cat.href}
                      onClick={onClose}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 hover:bg-gray-100 active:scale-[0.96] transition-all text-center"
                    >
                      <span className="text-2xl leading-none">{cat.icon}</span>
                      <span className="text-[11px] font-medium text-gray-600 leading-tight">{cat.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="px-4 pb-6 border-t border-gray-100 pt-4 flex flex-col gap-2.5">

              {/* Flash sales */}
              <Link
                to="/ventes-flash"
                onClick={onClose}
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white active:scale-[0.98] transition-transform"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
              >
                <Zap size={15} className="fill-white" />
                Ventes Flash — Jusqu'à -50%
              </Link>

              {/* Compte + Panier */}
              <div className="grid grid-cols-2 gap-2.5">
                <Link to="/login" onClick={onClose}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:border-gray-300 hover:bg-gray-100 active:scale-[0.97] transition-all">
                  <User size={15} className="text-gray-500" />
                  Mon Compte
                </Link>
                <Link to="/panier" onClick={onClose}
                  className="relative flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white active:scale-[0.97] transition-all"
                  style={{ background: GREEN }}>
                  <ShoppingCart size={15} />
                  Panier
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                    0
                  </span>
                </Link>
              </div>

              {/* Icônes rapides */}
              <div className="flex items-center justify-around pt-1 border-t border-gray-100 mt-1">
                {[
                  { href: '/commandes', icon: <Package size={18} />, label: 'Commandes' },
                  { href: '/nouveautes', icon: <Bell size={18} />, label: 'Nouveautés', badge: 5 },
                  { href: '/suivi', icon: <MapPin size={18} />, label: 'Suivi' },
                  { href: '/aide', icon: <HelpCircle size={18} />, label: 'Aide' },
                ].map(({ href, icon, label, badge }) => (
                  <Link key={href} to={href} onClick={onClose}
                    className="flex flex-col items-center gap-1 py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors relative">
                    <span className="text-gray-500">{icon}</span>
                    {badge && (
                      <span className="absolute top-1.5 right-2 min-w-[14px] h-[14px] rounded-full bg-blue-600 text-white text-[8px] font-bold flex items-center justify-center">
                        {badge}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-500 font-medium">{label}</span>
                  </Link>
                ))}
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ─────────────────────────────────────────
   HEADER
───────────────────────────────────────── */
export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [megaOpen,   setMegaOpen]   = useState(false)

  /* Ferme le menu mobile si on passe en desktop */
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const h = (e: MediaQueryListEvent) => { if (e.matches) setMobileOpen(false) }
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  /* Bloque le scroll body quand l'overlay est ouvert */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
    <header className="w-full z-50 fixed top-0 left-0 right-0">

      {/* 1 · TopBar (sm+) */}
      <TopBar />

      {/* 2 · Header principal */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-[60px] sm:h-[72px] flex items-center gap-4 sm:gap-6">

          {/* Logo */}
          <Link to="/" className="shrink-0" onClick={() => setMobileOpen(false)}>
            <img src="/imgs_dropship/logohori_dropship.png" alt="Koli" className="hidden sm:block h-10 sm:h-12 w-auto" />
            <img src="/imgs_dropship/favicon-dropship.png"  alt="Koli" className="sm:hidden h-9 w-auto" />
          </Link>

          {/* Search (desktop) */}
          <div className="hidden md:flex flex-1">
            <SearchBar />
          </div>

          {/* Icons (desktop) */}
          <div className="hidden md:flex items-center gap-5 lg:gap-6 ml-2">
            <ActionIcon icon={<User size={22}/>}         label="Bonjour, Identifiez-vous" sublabel="Mon Compte" href="/login"      />
            <ActionIcon icon={<Package size={22}/>}      label="Mes"                      sublabel="Commandes"  href="/commandes"  />
            <ActionIcon icon={<Bell size={22}/>}         label="Nouveautés"               sublabel="Produits"   badge={5} href="/nouveautes"/>
            <ActionIcon icon={<ShoppingCart size={22}/>} label="Mon Panier"               sublabel="0 FCFA"     badge={0} href="/panier"   />
          </div>

          {/* Mobile — panier + burger */}
          <div className="md:hidden ml-auto flex items-center gap-0.5">
            {/* Panier */}
            <AnimatePresence>
              {!mobileOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Link to="/panier" className="relative p-2.5 text-gray-600 hover:text-gray-900 transition-colors">
                    <ShoppingCart size={22} />
                    <span className="absolute top-6 right-0.5 min-w-[14px] h-[15px] rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                      style={{ background: GREEN }}>0</span>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Burger / X */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="relative w-11 h-11 flex items-center justify-center text-gray-700 hover:text-gray-900 transition-colors"
              aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              <motion.span
                className="absolute"
                animate={{ rotate: mobileOpen ? 90 : 0, opacity: mobileOpen ? 0 : 1, scale: mobileOpen ? 0.6 : 1 }}
                transition={{ duration: 0.22 }}
              >
                <Menu size={24} />
              </motion.span>
              <motion.span
                className="absolute text-white"
                animate={{ rotate: mobileOpen ? 0 : -90, opacity: mobileOpen ? 1 : 0, scale: mobileOpen ? 1 : 0.6 }}
                transition={{ duration: 0.22 }}
              >
                <X size={24} />
              </motion.span>
            </button>
          </div>

        </div>
      </div>

      {/* 3 · Nav bar (desktop) */}
      <div
        className="relative hidden md:block"
        style={{ background: 'linear-gradient(to top, transparent 0%, #ffffffff 60%)' }}
        onMouseLeave={() => setMegaOpen(false)}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-12 flex items-center justify-between gap-6">
          <CategoriesBtn />
          <nav className="flex items-center gap-7 flex-1 justify-center">
            {NAV_LINKS.map(item =>
              item.mega ? (
                <button key={item.href} onMouseEnter={() => setMegaOpen(true)}
                  className="flex items-center gap-1 text-sm font-medium transition-colors"
                  style={megaOpen ? { color: GREEN } : { color: '#4b5563' }}>
                  {item.label}
                  <ChevronDown size={13} className={`transition-transform duration-200 ${megaOpen ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <SimpleNavLink key={item.href} item={item} />
              )
            )}
          </nav>
          <Link to="/ventes-flash"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold text-white shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
            <Zap size={14} className="fill-white" /> VENTES FLASH
          </Link>
        </div>
        <FullMegaMenu open={megaOpen} onClose={() => setMegaOpen(false)} />
      </div>

    </header>

    {/* Full-screen overlay mobile */}
    <MobileOverlay open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  )
}
