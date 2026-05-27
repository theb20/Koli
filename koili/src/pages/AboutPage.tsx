import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'motion/react'
import { Link } from 'react-router-dom'
import {
  Target, Heart, Shield, Zap, Globe, Users,
  Package, Star, TrendingUp, Award, CheckCircle,
  ArrowRight, ChevronDown, Quote, Truck, Headphones, RefreshCw,
} from 'lucide-react'
import { PageMeta } from '../components/seo/PageMeta'

const BLUE = '#0421ff'

/* ─── Données ─────────────────────────────────────────────── */

const STATS = [
  { value: 12000, suffix: '+', label: 'Clients satisfaits',   icon: <Users size={20} /> },
  { value: 450,   suffix: '+', label: 'Produits disponibles', icon: <Package size={20} /> },
  { value: 98,    suffix: '%', label: 'Taux de satisfaction', icon: <Star size={20} /> },
  { value: 5,     suffix:  '', label: 'Années d\'expérience', icon: <Award size={20} /> },
]

const VALUES = [
  { icon: <Heart size={28} />,      title: 'Passion client',    desc: 'Chaque décision est prise en pensant à votre expérience. Votre satisfaction est notre unique mesure de succès.' },
  { icon: <Shield size={28} />,     title: 'Confiance & sécurité', desc: 'Paiements sécurisés, données protégées, produits authentiques. Nous ne faisons aucun compromis sur la confiance.' },
  { icon: <Zap size={28} />,        title: 'Rapidité',          desc: 'Livraison express, service client réactif, traitement immédiat des commandes. Votre temps est précieux.' },
  { icon: <Globe size={28} />,      title: 'Accessibilité',     desc: 'Des produits premium à des prix justes, livrés partout au Cameroun. La qualité pour tous.' },
  { icon: <Target size={28} />,     title: 'Excellence',        desc: 'Nous sélectionnons rigoureusement chaque produit. Si ce n\'est pas excellent, il ne figure pas dans notre catalogue.' },
  { icon: <TrendingUp size={28} />, title: 'Innovation',        desc: 'Toujours à l\'affût des dernières tendances pour vous proposer les meilleurs produits en avant-première.' },
]

const TIMELINE = [
  { year: '2020', title: 'La naissance de Koli', desc: 'Fondé à Douala par deux passionnés de tech et d\'e-commerce, Koli démarrait avec 20 produits soigneusement sélectionnés.', side: 'left'  },
  { year: '2021', title: 'Première expansion',   desc: '500 clients fidèles, lancement des livraisons express à Yaoundé. Notre catalogue atteint 100 produits.', side: 'right' },
  { year: '2022', title: 'La communauté grandit', desc: '3 000 membres actifs, partenariats avec les meilleures marques mondiales, ouverture du service client 7j/7.', side: 'left'  },
  { year: '2023', title: 'Koli 2.0',             desc: 'Refonte complète de la plateforme, lancement de l\'application mobile, programme fidélité Bronze / Silver / Gold.', side: 'right' },
  { year: '2024', title: 'Numéro 1 au Cameroun', desc: '10 000 clients, 400+ produits, livraison dans 8 villes. La référence e-commerce pour l\'Afrique centrale.', side: 'left'  },
  { year: '2026', title: 'Aujourd\'hui',          desc: '12 000+ familles satisfaites, expansion en cours vers la Côte d\'Ivoire et le Sénégal. L\'aventure continue.', side: 'right' },
]

const TEAM = [
  { name: 'Alain Mbida',    role: 'CEO & Co-fondateur',    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400', quote: 'Notre mission : rendre l\'excellence accessible à chaque foyer.' },
  { name: 'Christelle Ngo', role: 'Directrice Produit',    img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400', quote: 'Je sélectionne chaque produit comme si je l\'achetais pour ma famille.' },
  { name: 'Patrick Essama', role: 'Responsable Logistique', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=400', quote: 'Un colis livré à temps, c\'est une promesse tenue.' },
  { name: 'Solange Tchoua', role: 'Head of Customer Care',  img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400', quote: 'Chaque client mérite une réponse rapide et un sourire.' },
]

const TESTIMONIALS = [
  { name: 'Marie K.',  city: 'Douala',   text: 'J\'ai commandé une montre connectée, livrée en moins de 24h. La qualité était exactement celle des photos. Je recommande Koli à tout le monde !', stars: 5, img: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=200' },
  { name: 'Jean-Paul T.', city: 'Yaoundé', text: 'Service client exceptionnel. J\'avais un problème avec ma commande et ils ont tout réglé en moins de 2h. C\'est rare de voir ça !', stars: 5, img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200' },
  { name: 'Fatima D.', city: 'Bafoussam', text: 'Les prix sont imbattables par rapport à ce qu\'on trouve en magasin. Et la qualité est au rendez-vous. Koli est ma boutique préférée.', stars: 5, img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200' },
]

const GUARANTEES = [
  { icon: <Truck size={22} />,       title: 'Livraison rapide',    desc: 'Partout au Cameroun sous 24–72h' },
  { icon: <Shield size={22} />,      title: 'Paiement sécurisé',   desc: 'Orange Money, MTN, Wave & cash' },
  { icon: <RefreshCw size={22} />,   title: 'Retours faciles',     desc: '14 jours pour changer d\'avis' },
  { icon: <Headphones size={22} />,  title: 'Support 7j/7',        desc: 'WhatsApp & téléphone toujours disponibles' },
]

/* ─── Animated Counter ─────────────────────────────────────── */
function Counter({ to, suffix }: { to: number; suffix: string }) {
  const ref  = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [count, setCount] = useState(0)

  useRef(() => {})  // noop to keep lint quiet

  if (inView && count === 0 && to > 0) {
    const step = Math.ceil(to / 60)
    const id = setInterval(() => {
      setCount(c => {
        if (c + step >= to) { clearInterval(id); return to }
        return c + step
      })
    }, 16)
  }

  return <span ref={ref}>{count.toLocaleString('fr-FR')}{suffix}</span>
}

/* ─── Section wrapper avec fade-in ────────────────────────── */
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ─── FAQ Accordion ────────────────────────────────────────── */
const FAQ_ITEMS = [
  { q: 'Comment fonctionne la livraison ?',           a: 'Nous livrons partout au Cameroun. La livraison standard prend 24 à 72h selon votre ville. La livraison express garantit la réception le lendemain pour Douala et Yaoundé.' },
  { q: 'Les produits sont-ils garantis ?',             a: 'Oui, tous nos produits sont garantis 6 à 24 mois selon la catégorie. En cas de problème, notre service après-vente prend en charge le remplacement ou le remboursement.' },
  { q: 'Quels modes de paiement acceptez-vous ?',     a: 'Nous acceptons Orange Money, MTN Mobile Money, Wave et le paiement à la livraison (cash). Des facilités de paiement sont disponibles pour les commandes supérieures à 100 000 FCFA.' },
  { q: 'Puis-je retourner un article ?',               a: 'Oui, vous disposez de 14 jours après réception pour retourner un article non utilisé dans son emballage d\'origine. Le remboursement est effectué sous 48h.' },
  { q: 'Comment suivre ma commande ?',                 a: 'Dès votre commande confirmée, vous recevez un lien de suivi par SMS et WhatsApp. Vous pouvez aussi suivre votre commande depuis votre espace profil sur Koli.' },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 group"
      >
        <span className="text-gray-900 font-medium text-sm sm:text-base group-hover:text-blue-600 transition-colors">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 text-gray-400">
          <ChevronDown size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-gray-500 text-sm leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Page ─────────────────────────────────────────────────── */
export function AboutPage() {
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  return (
    <div className="bg-white">
      <PageMeta
        title="À propos de Koli"
        description="Découvrez l'histoire de Koli : notre mission, nos valeurs et pourquoi plus de 12 000 Camerounais nous font confiance."
        path="/about"
        image="/wall/og-about.jpg"
      />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden bg-gray-950">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1600"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900/95 to-gray-950/90" />
        </div>

        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-24 grid lg:grid-cols-2 gap-16 items-center w-full">
          {/* Left */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/70 text-xs font-semibold mb-6 backdrop-blur-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Fondé en 2020 · Douala, Cameroun
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[0.92] tracking-tight mb-6"
            >
              Commerce<br />
              <span style={{ color: BLUE }}>sans</span><br />
              frontières
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
              className="text-white/60 text-lg leading-relaxed max-w-xl mb-10"
            >
              Koli est née d'une conviction simple : chaque Camerounais mérite accès aux meilleurs produits mondiaux,
              livrés rapidement et à des prix justes. Depuis 2020, nous transformons cette vision en réalité.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }}
              className="flex flex-wrap gap-4"
            >
              <Link to="/catalogue"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: BLUE }}>
                Découvrir le catalogue <ArrowRight size={16} />
              </Link>
              <Link to="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-colors">
                Nous contacter
              </Link>
            </motion.div>
          </div>

          {/* Right — Stats */}
          <motion.div
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
                className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm flex flex-col gap-3"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${BLUE}20`, color: BLUE }}>
                  {s.icon}
                </div>
                <div className="text-4xl font-black text-white tabular-nums">
                  <Counter to={s.value} suffix={s.suffix} />
                </div>
                <p className="text-white/50 text-xs font-medium leading-tight">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-white/30 text-[10px] tracking-[0.2em] uppercase">Découvrir</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} className="w-px h-8 bg-white/20" />
        </motion.div>
      </section>

      {/* ── GUARANTEES STRIP ─────────────────────────────────── */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0 lg:divide-x divide-gray-200">
            {GUARANTEES.map((g, i) => (
              <FadeIn key={g.title} delay={i * 0.08} className="flex items-center gap-4 lg:px-8 first:pl-0 last:pr-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${BLUE}10`, color: BLUE }}>
                  {g.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{g.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{g.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── MISSION ──────────────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Image */}
          <FadeIn className="relative">
            <div className="rounded-3xl overflow-hidden aspect-[4/3]">
              <img
                src="https://images.unsplash.com/photo-1556741533-974f8e62a92d?q=80&w=900"
                alt="Équipe Koli"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-5 -right-5 bg-white rounded-2xl shadow-xl p-5 flex items-center gap-4 border border-gray-100">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${BLUE}10`, color: BLUE }}>
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">4.9/5</p>
                <p className="text-xs text-gray-500 font-medium">Note moyenne clients</p>
                <div className="flex gap-0.5 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={10} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Text */}
          <FadeIn delay={0.15}>
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: BLUE }}>
              Notre mission
            </p>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 leading-tight mb-6">
              Rendre l'excellence<br />
              <span className="text-gray-400">accessible à tous</span>
            </h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              Nous croyons que la qualité ne devrait pas être réservée à une élite. Koli sélectionne
              rigoureusement les meilleurs produits du monde entier et les met à portée de chaque
              Camerounais, avec une livraison rapide et un service après-vente irréprochable.
            </p>
            <p className="text-gray-500 leading-relaxed mb-8">
              Chaque produit dans notre catalogue a été testé, évalué et approuvé par notre équipe
              avant d'être proposé à nos clients. Nous ne vendons que ce que nous recommanderions
              à notre propre famille.
            </p>
            <div className="flex flex-wrap gap-3">
              {['Sélection rigoureuse', 'Prix transparents', 'Service humain', 'Livraison fiable'].map(tag => (
                <span key={tag} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border border-gray-200 text-gray-700">
                  <CheckCircle size={13} style={{ color: BLUE }} />
                  {tag}
                </span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── VALUES ───────────────────────────────────────────── */}
      <section className="py-24 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <FadeIn className="text-center mb-16">
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: BLUE }}>
              Ce qui nous guide
            </p>
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">Nos valeurs fondamentales</h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Ces 6 valeurs ne sont pas des slogans marketing — elles définissent chaque décision que nous prenons.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map((v, i) => (
              <FadeIn key={v.title} delay={i * 0.08}>
                <div className="group p-7 rounded-2xl border border-white/8 bg-white/4 hover:bg-white/8 transition-all duration-300 h-full">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-colors" style={{ background: `${BLUE}20`, color: BLUE }}>
                    {v.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">{v.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{v.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── TIMELINE ─────────────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-4 lg:px-8">
        <FadeIn className="text-center mb-16">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: BLUE }}>
            Notre parcours
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">6 ans d'histoire</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            De 20 produits dans un appartement de Douala à la référence e-commerce du Cameroun.
          </p>
        </FadeIn>

        {/* Desktop timeline */}
        <div className="hidden lg:block relative">
          {/* Center line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-100" />

          <div className="space-y-12">
            {TIMELINE.map((item, i) => (
              <FadeIn key={item.year} delay={i * 0.1}>
                <div className={`flex items-center gap-8 ${item.side === 'right' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex-1 ${item.side === 'right' ? 'text-left' : 'text-right'}`}>
                    <div className={`inline-block p-6 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow max-w-sm ${item.side === 'right' ? '' : 'ml-auto'}`}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: BLUE }}>{item.year}</p>
                      <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                  {/* Dot */}
                  <div className="w-10 h-10 rounded-full border-4 border-white shadow-md flex items-center justify-center shrink-0 z-10" style={{ background: BLUE }}>
                    <span className="text-white text-xs font-black">{i + 1}</span>
                  </div>
                  <div className="flex-1" />
                </div>
              </FadeIn>
            ))}
          </div>
        </div>

        {/* Mobile timeline */}
        <div className="lg:hidden relative pl-8">
          <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-100" />
          <div className="space-y-8">
            {TIMELINE.map((item, i) => (
              <FadeIn key={item.year} delay={i * 0.08}>
                <div className="relative">
                  <div className="absolute -left-[29px] w-5 h-5 rounded-full border-4 border-white shadow" style={{ background: BLUE }} />
                  <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: BLUE }}>{item.year}</p>
                    <h3 className="font-bold text-gray-900 mb-2 text-sm">{item.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM ─────────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <FadeIn className="text-center mb-16">
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: BLUE }}>
              Les visages de Koli
            </p>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">Notre équipe</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Passionnés, exigeants et entièrement dévoués à votre satisfaction.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM.map((member, i) => (
              <FadeIn key={member.name} delay={i * 0.1}>
                <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="relative overflow-hidden aspect-square">
                    <img
                      src={member.img}
                      alt={member.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                      <p className="text-white text-sm italic">"{member.quote}"</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="font-bold text-gray-900">{member.name}</p>
                    <p className="text-xs font-medium mt-0.5" style={{ color: BLUE }}>{member.role}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-4 lg:px-8">
        <FadeIn className="text-center mb-16">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: BLUE }}>
            Ils nous font confiance
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">Ce que disent nos clients</h2>
        </FadeIn>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {TESTIMONIALS.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.1}>
              <div
                onClick={() => setActiveTestimonial(i)}
                className={`p-7 rounded-2xl border cursor-pointer transition-all duration-300 ${activeTestimonial === i ? 'border-blue-500 shadow-lg shadow-blue-100' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(t.stars)].map((_, si) => (
                    <Star key={si} size={14} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <Quote size={20} className="text-gray-200 mb-3" />
                <p className="text-gray-600 text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.img} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="font-bold text-sm text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.city}</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveTestimonial(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: activeTestimonial === i ? 24 : 8,
                height: 8,
                background: activeTestimonial === i ? BLUE : '#e5e7eb',
              }}
            />
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 lg:px-8">
          <FadeIn className="text-center mb-16">
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: BLUE }}>
              Vos questions
            </p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">Questions fréquentes</h2>
            <p className="text-gray-500">Tout ce que vous voulez savoir sur Koli.</p>
          </FadeIn>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-2">
            {FAQ_ITEMS.map(item => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-24 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/60 text-xs font-semibold mb-8">
              <Zap size={12} style={{ color: BLUE }} /> Rejoignez 12 000+ clients satisfaits
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 leading-tight">
              Prêt à découvrir<br />
              <span style={{ color: BLUE }}>Koli</span> ?
            </h2>
            <p className="text-white/50 mb-10 text-lg max-w-xl mx-auto">
              Parcourez notre catalogue de 450+ produits premium et bénéficiez de la livraison rapide partout au Cameroun.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/catalogue"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: BLUE }}>
                Voir le catalogue <ArrowRight size={16} />
              </Link>
              <Link to="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-colors">
                Nous contacter
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  )
}
