import { useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'
import { Link } from 'react-router-dom'
import {
  Target, Heart, Shield, Zap, Globe, Users,
  Package, Star, TrendingUp, Award, CheckCircle,
  ArrowRight, Quote, Truck, Headphones, RefreshCw,
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
  { year: '2024', title: 'La naissance de Skignas',      desc: 'Fondé à Abidjan par M. Serge Soro, passionné de tech et d\'e-commerce, Skignas démarre avec une vingtaine de produits soigneusement sélectionnés et une promesse simple : des prix justes en FCFA et une livraison fiable.', side: 'left'  },
  { year: '2024', title: 'Les premières commandes',      desc: 'Paiement mobile money intégré dès le départ (Wave, Orange Money), premières livraisons dans les communes d\'Abidjan. La confiance des tout premiers clients se construit, commande après commande.', side: 'right' },
  { year: '2025', title: 'La communauté grandit',        desc: 'Le catalogue s\'étoffe, le service client sur WhatsApp devient une signature. Livraison étendue au-delà d\'Abidjan, vers Bouaké et Yamoussoukro. Le bouche-à-oreille fait son travail.', side: 'left'  },
  { year: '2025', title: 'Skignas passe à la vitesse supérieure', desc: 'Refonte de la plateforme, mise en place du suivi de commande en temps réel et de points relais pour sécuriser le dernier kilomètre. Ajout de Moov Money et MTN MoMo au paiement.', side: 'right' },
  { year: '2026', title: 'L\'app mobile',                desc: 'Lancement de l\'application mobile pensée pour tous les smartphones, même en 3G, et d\'un programme de fidélité. Skignas livre désormais dans plusieurs villes de Côte d\'Ivoire.', side: 'left'  },
  { year: 'Aujourd\'hui', title: 'L\'aventure continue', desc: 'Une communauté grandissante de clients satisfaits à travers la Côte d\'Ivoire. Skignas continue d\'enrichir son catalogue et d\'améliorer l\'expérience, avec l\'ambition de rayonner dans toute la sous-région.', side: 'right' },
]

const TEAM = [
   {
    name: 'Serge Soro',
    role: 'Fondateur & CEO',
    img: '/wall/soro_serge.png',
    quote: 'Notre ambition est de rendre la technologie accessible à tous, avec des produits fiables et un service irréprochable.'
  },
  {
    name: 'Frédérick Ahobaut',
    role: 'Co-fondateur & Responsable IT',
    img: 'https://media.licdn.com/dms/image/v2/D4E35AQFCIdkWlRMLGA/profile-framedphoto-shrink_800_800/B4EZ347Q8ZGkAg-/0/1777997779570?e=1783911600&v=beta&t=Y_h8P7XEkgz5gTPBjrnoRNTMPR4_92qvi54GfGPDTXk',
    quote: 'Je veille à ce que chaque produit et chaque fonctionnalité de Skignas offrent une expérience simple, rapide et sécurisée.'
  }
]

const TESTIMONIALS = [
  { name: 'Aya K.',       city: 'Cocody, Abidjan',   text: 'J\'ai commandé une montre connectée, payée avec Wave, livrée chez moi à Cocody en moins de 24h. La qualité était exactement celle des photos. Je recommande Skignas à tout le monde !', stars: 5, img: 'https://media.licdn.com/dms/image/v2/C4D03AQETq5RZ_MigKQ/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1523605897645?e=2147483647&v=beta&t=1xq1DSAAn4csLAneB-m7JUjZGKQ0d_amva7NfosPOo4' },
  { name: 'Konan Y.',     city: 'Bouaké',            text: 'Service client exceptionnel. J\'avais un souci avec ma commande et l\'équipe a tout réglé en moins de 2h sur WhatsApp. Même depuis Bouaké, la livraison a suivi sans problème. C\'est rare de voir ça !', stars: 5, img: 'https://media.licdn.com/dms/image/v2/D5603AQFFAUYtwSTgfA/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1712179821336?e=2147483647&v=beta&t=chQwDJ110RIhsjplDsWddbj14cJ9UZSkq3sMdLljRtw' },
  { name: 'Aminata T.',   city: 'Yopougon, Abidjan', text: 'Les prix sont imbattables par rapport à ce qu\'on trouve en boutique à Abidjan. Paiement Orange Money accepté, tout est simple. Koli est devenue ma boutique préférée.', stars: 5, img: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Bagayoko_Aminita_TRAORE.jpg' },
  { name: 'Kouadio N\'G.', city: 'Yamoussoukro',      text: 'Première commande un peu stressé de payer avant de recevoir, mais le suivi en temps réel m\'a rassuré. Colis reçu au point relais comme prévu. Je commande à nouveau sans hésiter.', stars: 5, img: 'https://www.wakatsera.com/wp-content/uploads/2025/06/Kouadio-300x194.jpg' },
  { name: 'Mariam C.',    city: 'San-Pédro',         text: 'Habitant loin d\'Abidjan, je craignais pour la livraison. Finalement reçu en 3 jours, bien emballé. Le rapport qualité-prix est vraiment top. Merci à toute l\'équipe.', stars: 4, img: 'https://cdn.prod.website-files.com/660a7aaf0d2e1e2cd2ff2737/677ce8885c9edf6735f69638_mariam-ba-lagare-looks-2.png' },
  { name: 'Ibrahim B.',   city: 'Marcory, Abidjan',  text: 'Écouteurs commandés le matin, livrés l\'après-midi à Marcory. Paiement mobile money en deux clics, aucun stress. Franchement, c\'est du sérieux.', stars: 5, img: 'https://prod.cdn-medias.jeuneafrique.com/cdn-cgi/image/q=auto,f=auto,metadata=none,width=1215,fit=cover/https://prod.cdn-medias.jeuneafrique.com/medias/2010/09/09/009092010154826000000ibk-large.jpg' },
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



/* ─── Page ─────────────────────────────────────────────────── */
export function AboutPage() {
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  return (
    <div className="bg-white">
      <PageMeta
        title="À propos de Skignas"
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
              Fondé en 2020 · Abidjan côte d'ivoire
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
              Nous croyons que la qualité ne devrait pas être réservée à une élite. Skignas sélectionne
              rigoureusement les meilleurs produits du monde entier et les met à portée de chaque
              Ivoirien, avec une livraison rapide et un service après-vente irréprochable.
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
              Les visages de Skignas
            </p>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">Notre équipe</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Passionnés, exigeants et entièrement dévoués à votre satisfaction.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-6">
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


      {/* ── CTA ──────────────────────────────────────────────── 
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
              <span style={{ color: BLUE }}>Skignas</span> ?
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
      </section>*/}
    </div>
  )
}
