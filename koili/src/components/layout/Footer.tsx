import { useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { Link } from 'react-router-dom'
import {
  Mail, Phone, MapPin, ArrowRight,
  CheckCircle2, ShoppingBag, Star,
  Truck, Headphones, TrendingUp, Send,
} from 'lucide-react'
import { useSiteSettings, telLink } from '../../hooks/useSiteSettings'

/* ─────────────────────────────────────────
   TOKENS
───────────────────────────────────────── */
const GREEN      = '#3b9c3c'
const GREEN_DARK = '#063c28'
const ORANGE     = '#fb6c08'

/* ─────────────────────────────────────────
   DATA
───────────────────────────────────────── */
const STATS = [
  { icon: ShoppingBag, value: 10000, suffix: '+', label: 'Clients actifs',    href: '/about'      },
  { icon: TrendingUp,  value: 500,   suffix: '+', label: 'Produits gagnants', href: '/catalogue'  },
  { icon: Star,        value: 98,    suffix: '%', label: 'Satisfaction',      href: '/about'      },
  { icon: Headphones,  value: 24,    suffix: 'h', label: 'Support dispo',     href: '/contact'    },
]

const COLUMNS = [
  {
    title: 'Navigation',
    links: [
      { label: 'Catalogue',         href: '/catalogue'          },
      { label: 'Meilleures ventes', href: '/catalogue?sort=sold' },
      { label: 'Nouveautés',        href: '/catalogue?badge=new' },
      { label: 'Offres flash',      href: '/catalogue?badge=hot' },
      { label: 'Blog',              href: '/blog'               },
    ],
  },
  {
    title: 'Entreprise',
    links: [
      { label: 'À propos',          href: '/about'         },
      { label: 'Partenaires',       href: '/about'         },
      { label: 'Carrières',         href: '/about'         },
      { label: 'Presse',            href: '/about'         },
      { label: 'Contact',           href: '/contact'       },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'FAQ',               href: '/contact'           },
      { label: 'Livraison',         href: '/cgu#services'      },
      { label: 'Retours & remboursements', href: '/cgu#paiement' },
      { label: 'Suivi commande',    href: '/contact'           },
      { label: 'Nous contacter',    href: '/contact'           },
    ],
  },
  {
    title: 'Légal',
    links: [
      { label: 'Confidentialité',   href: '/privacy'           },
      { label: 'CGU',               href: '/cgu'               },
      { label: 'Mentions légales',  href: '/legal'             },
      { label: 'Vos droits RGPD',   href: '/privacy#droits'    },
      { label: 'Cookies',           href: '/privacy#cookies'   },
    ],
  },
]

const SOCIAL_DEFAULTS: Record<string, string> = {
  Instagram: 'https://instagram.com/skignas',
  Facebook:  'https://facebook.com/skignas',
  YouTube:   'https://youtube.com/@skignas',
  TikTok:    'https://tiktok.com/@skignas',
}

const SOCIALS = [
  {
    label: 'Instagram',
    href: SOCIAL_DEFAULTS.Instagram,
    color: '#E1306C',
    svg: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: SOCIAL_DEFAULTS.Facebook,
    color: '#1877F2',
    svg: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: SOCIAL_DEFAULTS.YouTube,
    color: '#FF0000',
    svg: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
        <polygon fill="currentColor" stroke="none" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: SOCIAL_DEFAULTS.TikTok,
    color: '#010101',
    svg: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.69a8.16 8.16 0 0 0 4.77 1.52V7.77a4.85 4.85 0 0 1-1-.08z"/>
      </svg>
    ),
  },
]

const BADGES = [
  { label: 'Livraison sécurisée',    icon: Truck,        href: '/cgu#services' },
  { label: 'Paiement 100% sécurisé', icon: CheckCircle2, href: '/cgu#paiement' },
  { label: 'Retour 30 jours',        icon: ArrowRight,   href: '/cgu#paiement' },
]

/* ─────────────────────────────────────────
   ANIMATED COUNTER
───────────────────────────────────────── */
function AnimatedCounter({ target, suffix, inView }: { target: number; suffix: string; inView: boolean }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    let start = 0
    const duration = 1600
    const step = Math.ceil(target / (duration / 16))
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(start)
      }
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target])

  return (
    <span className="tabular-nums">
      {count.toLocaleString('fr-FR')}{suffix}
    </span>
  )
}

/* ─────────────────────────────────────────
   FOOTER
───────────────────────────────────────── */
const API = import.meta.env.VITE_API_URL

export function Footer() {
  const [email, setEmail]       = useState('')
  const [sent, setSent]         = useState(false)
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState('')
  const [focused, setFocused]   = useState(false)
  const statsRef                = useRef<HTMLDivElement>(null)
  const statsInView             = useInView(statsRef, { once: true, margin: '-80px' })
  const settings                = useSiteSettings()

  const socials = SOCIALS.map(s => ({
    ...s,
    href: (settings[`${s.label.toLowerCase()}Url` as keyof typeof settings] as string | null | undefined) || s.href,
  }))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email || sending) return
    setSending(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Erreur')
      setSent(true)
      setEmail('')
      setTimeout(() => setSent(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur, réessayez')
    } finally {
      setSending(false)
    }
  }

  return (
    <footer>

      {/* ════════════════════════════════════
          ZONE 1 — HERO NEWSLETTER (vert foncé)
      ════════════════════════════════════ */}
      <div
        className="relative overflow-hidden"
        style={{
          background: GREEN_DARK,
          backgroundImage: `url('/flyers/2.webp')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'multiply',
        }}
      >
        {/* Orbes déco */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-[100px]"
          style={{ background: GREEN }} />
        <div className="absolute -bottom-20 right-10 w-72 h-72 rounded-full opacity-15 blur-[80px]"
          style={{ background: ORANGE }} />

        {/* Grille de points */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-20">
          <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-14">

            {/* Left — Texte */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1"
            >
              <span
                className="inline-flex items-center gap-2 text-xs  tracking-[0.15em] uppercase px-3 py-1.5 rounded-full mb-6"
                style={{ background: `${ORANGE}25`, color: ORANGE }}
              >
                Newsletter exclusive
              </span>
              <h2 className="text-white text-2xl sm:text-4xl lg:text-5xl font-bold leading-[1.08] tracking-tight mb-4">
                Rejoignez plus de<br />
                <span style={{ color: '#86efac' }}>10 000 dropshippers</span><br />
                qui réussissent.
              </h2>
              <p className="text-white/50 text-base leading-relaxed max-w-md">
                Recevez en avant-première nos meilleurs produits gagnants, tendances du marché et conseils pour scaler votre business.
              </p>
            </motion.div>

            {/* Right — Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="w-full lg:w-[440px] shrink-0"
            >
              {sent ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-3 py-10 text-center"
                >
                  <CheckCircle2 size={40} className="text-green-400" />
                  <p className="text-white text-lg font-bold">C'est parti ! 🎉</p>
                  <p className="text-white/50 text-sm">Tu vas recevoir nos meilleurs deals en avant-première.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <label className="text-white/40 text-xs font-semibold tracking-widest uppercase">
                    Ton adresse email
                  </label>
                  <div
                    className="flex gap-2 p-1.5 rounded-2xl transition-all duration-300"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: `1.5px solid ${focused ? GREEN : 'rgba(255,255,255,0.12)'}`,
                      boxShadow: focused ? `0 0 0 4px ${GREEN}25` : 'none',
                    }}
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      placeholder="ton@email.com"
                      className="flex-1 bg-transparent px-3 py-2.5 text-white text-sm outline-none placeholder:text-white/30"
                    />
                    <motion.button
                      type="submit"
                      disabled={sending}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold shrink-0 transition-all disabled:opacity-60"
                      style={{ background: `linear-gradient(135deg, ${GREEN}, #22c55e)` }}
                    >
                      <Send size={14} className={sending ? 'animate-pulse' : ''} />
                      {sending ? 'Envoi…' : "S'inscrire"}
                    </motion.button>
                  </div>
                  {error && (
                    <p className="text-red-400 text-xs font-medium">⚠ {error}</p>
                  )}
                  <p className="text-white/25 text-xs">
                    Pas de spam. Désabonnement en 1 clic. Voir notre{' '}
                    <Link to="/privacy" className="underline hover:text-white/50 transition-colors">
                      politique de confidentialité
                    </Link>.
                  </p>
                </form>
              )}

              {/* Trust badges */}
              <div className="flex flex-wrap items-center gap-4 mt-8 pt-6"
                style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
              >
                {BADGES.map(({ label, icon: Icon, href }) => (
                  <Link
                    key={label}
                    to={href}
                    className="flex items-center gap-1.5 group transition-opacity hover:opacity-80"
                  >
                    <Icon size={13} style={{ color: '#86efac' }} />
                    <span className="text-white/40 text-[11px] font-medium group-hover:text-white/60 transition-colors">
                      {label}
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>

          </div>
        </div>

        {/* ── STATS ── */}
        <div
          ref={statsRef}
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pb-8 sm:pb-12"
        >
          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {STATS.map(({ icon: Icon, value, suffix, label, href }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <Link
                  to={href}
                  className="group flex flex-col items-center gap-2 py-7 px-4 text-center transition-colors hover:bg-white/[0.04]"
                >
                  <Icon size={18} style={{ color: GREEN }} className="transition-transform group-hover:scale-110" />
                  <p className="text-white text-3xl font-black leading-none">
                    <AnimatedCounter target={value} suffix={suffix} inView={statsInView} />
                  </p>
                  <p className="text-white/40 text-xs font-medium group-hover:text-white/60 transition-colors">{label}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
          ZONE 2 — LIENS (fond blanc)
      ════════════════════════════════════ */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-16">
          <div className="flex flex-col lg:flex-row gap-10 sm:gap-12">

            {/* Brand column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col gap-6 lg:w-64 shrink-0"
            >
              {/* Logo */}
              <Link to="/" className="group flex items-center gap-2.5 w-fit">
                <img src="/imgs_dropship/logoSkignas.png" className="w-60 lg:w-90 h-18.5" alt="logo dropshipping" />
              </Link>

              <p className="text-gray-400 text-sm leading-relaxed">
                La plateforme des dropshippers ambitieux. Trouvez, vendez et scalez sans stock.
              </p>

              {/* Contact */}
              <div className="flex flex-col gap-2.5">
                <a href={`mailto:${settings.contactEmail}`}
                  className="flex items-center gap-2.5 text-gray-400 text-sm hover:text-gray-800 transition-colors group">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:border-gray-200 transition-colors">
                    <Mail size={12} className="text-gray-400" />
                  </div>
                  {settings.contactEmail}
                </a>
                <a href={telLink(settings.supportPhone)}
                  className="flex items-center gap-2.5 text-gray-400 text-sm hover:text-gray-800 transition-colors group">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:border-gray-200 transition-colors">
                    <Phone size={12} className="text-gray-400" />
                  </div>
                  {settings.supportPhone}
                </a>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(settings.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 text-gray-400 text-sm hover:text-gray-800 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:border-gray-200 transition-colors">
                    <MapPin size={12} className="text-gray-400" />
                  </div>
                  {settings.address}
                </a>
              </div>

              {/* Socials */}
              <div>
                <p className="text-gray-300 text-[10px] font-bold tracking-[0.2em] uppercase mb-3">
                  Suivez-nous
                </p>
                <div className="flex gap-2">
                  {socials.map(({ label, href, svg, color }) => (
                    <motion.a
                      key={label}
                      href={href}
                      aria-label={label}
                      target="_blank"
                      rel="noreferrer"
                      whileHover={{ scale: 1.12, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-9 h-9 rounded-xl border border-gray-100 bg-white flex items-center justify-center text-gray-400 transition-all hover:border-transparent hover:shadow-md"
                      style={{ '--hover-color': color } as React.CSSProperties}
                      onMouseEnter={e => {
                        const el = e.currentTarget
                        el.style.color = color
                        el.style.borderColor = `${color}30`
                        el.style.background = `${color}10`
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget
                        el.style.color = ''
                        el.style.borderColor = ''
                        el.style.background = ''
                      }}
                    >
                      {svg}
                    </motion.a>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Nav columns */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-8">
              {COLUMNS.map((col, ci) => (
                <motion.div
                  key={col.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ delay: ci * 0.08, duration: 0.5 }}
                >
                  <h4 className="text-gray-900 font-bold text-sm mb-5 tracking-tight">
                    {col.title}
                  </h4>
                  <ul className="flex flex-col gap-3">
                    {col.links.map(({ label, href }) => (
                      <li key={label}>
                        <Link
                          to={href}
                          className="group flex items-center gap-1.5 text-gray-400 text-sm hover:text-gray-900 transition-colors"
                        >
                          <span className="w-0 group-hover:w-2.5 overflow-hidden transition-all duration-200">
                            <ArrowRight size={10} style={{ color: GREEN }} />
                          </span>
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
          ZONE 3 — WATERMARK GÉANT
      ════════════════════════════════════ */}
      <div className="bg-white select-none pointer-events-none overflow-hidden" aria-hidden>
        <p
          className="watermark-shimmer lg:text-[clamp(70px,30vw,340px)] text-[clamp(80px,10vw,340px)] font-black leading-none whitespace-nowrap text-center pb-10 [-letter-spacing:0.04em]"
        >
          Skignas
        </p>
      </div>

    </footer>
  )
}
