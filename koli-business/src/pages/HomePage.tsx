import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Zap, ShieldCheck, LineChart, Truck, Wallet, Headset, ArrowRight, ChevronLeft, ChevronRight, Plus, Minus, Quote } from 'lucide-react'

const BENEFITS = [
  { icon: Zap,         title: 'Mise en ligne simple',    desc: 'Ajoutez un produit en moins de 2 minutes, photos comprises.' },
  { icon: ShieldCheck, title: 'Paiements sécurisés',      desc: 'Mobile money et carte bancaire, versés directement sur votre compte.' },
  { icon: LineChart,   title: 'Suivi en temps réel',      desc: 'Commandes, stocks et statistiques de vente, à jour en permanence.' },
  { icon: Truck,       title: 'Livraison intégrée',       desc: 'Nos partenaires livreurs récupèrent vos colis chez vous.' },
  { icon: Wallet,      title: "0 FCFA à l'inscription",   desc: "Aucun frais d'entrée — une commission uniquement sur vos ventes." },
  { icon: Headset,     title: 'Support 24/7',             desc: 'Une équipe dédiée aux marchands, joignable à tout moment.' },
]

const STEPS = [
  { n: '1', title: 'Créez votre compte',  desc: 'Inscription en 3 minutes avec votre e-mail et les infos de votre boutique.' },
  { n: '2', title: 'Publiez vos produits', desc: 'Photos, prix, stock — votre catalogue est en ligne immédiatement.' },
  { n: '3', title: 'Vendez et encaissez',  desc: 'Chaque vente est versée sur votre compte sous 48 h maximum.' },
]

const ORDER_ROWS = [
  { client: 'Awa Diop',      date: '22 juil.', from: 'Caméra 360° extérieure 2K',   amount: '79 900 F' },
  { client: 'Koffi Traoré',  date: '22 juil.', from: 'Routeur Wi-Fi 6 Mesh',         amount: '129 900 F' },
  { client: 'Mariam Bâ',     date: '21 juil.', from: 'Casque gaming sans fil 7.1',   amount: '64 900 F' },
  { client: 'Jean Mensah',   date: '21 juil.', from: 'Assistant vocal + hub',        amount: '44 900 F' },
  { client: 'Fatou Sow',     date: '20 juil.', from: 'Barre de son 5.1',             amount: '89 900 F' },
]

const WALKTHROUGH = [
  {
    title: 'Tableau de bord',
    desc: "Le tableau de bord vous permet de gérer l'intégralité de votre activité. Ajoutez des produits, configurez vos catégories et suivez vos commandes depuis une seule interface. Toutes les fonctions opérationnelles y sont réunies : gestion du catalogue, suivi des commandes, consultation du solde et de l'historique des versements.",
  },
  {
    title: 'Suivi des commandes',
    desc: 'Chaque commande est visible en temps réel, de la confirmation à la livraison. Filtrez par statut, retrouvez un client ou une référence en quelques secondes, et recevez une notification à chaque nouvelle vente.',
  },
  {
    title: 'Statistiques de vente',
    desc: "Analysez vos performances jour par jour : chiffre d'affaires, produits les plus vendus, panier moyen. De quoi ajuster votre catalogue et vos prix en toute confiance.",
  },
]

const STATS = [
  { value: '12 500+', label: 'marchands actifs' },
  { value: '3,2 Mrd F', label: 'versés aux marchands en 2025' },
  { value: '48 h', label: 'délai de versement maximum' },
  { value: '4,8/5', label: 'satisfaction moyenne des marchands' },
]

const TESTIMONIALS = [
  { quote: "En 6 mois, Skignas est devenu mon premier canal de vente. La mise en ligne des produits est vraiment rapide.", name: 'Awa Diop', shop: 'AD Électronique · Dakar' },
  { quote: "Les versements sont toujours dans les délais annoncés. C'est ce qui compte le plus pour gérer ma trésorerie.", name: 'Koffi Traoré', shop: 'K-Tech Store · Abidjan' },
  { quote: "Le support répond vite, même le week-end. J'ai pu régler un souci de livraison en quelques minutes.", name: 'Mariam Bâ', shop: 'Mariam Gadgets · Bamako' },
]

const FAQS = [
  { q: "Combien coûte l'inscription sur Skignas ?", a: "L'inscription est entièrement gratuite. Vous ne payez qu'une commission sur vos ventes réalisées, aucun frais fixe ni engagement." },
  { q: 'Quand suis-je payé après une vente ?', a: 'Vos gains sont versés sur votre compte sous 48 h maximum après confirmation de la livraison, via Wave, Orange Money, MTN Money ou virement bancaire.' },
  { q: 'Comment fonctionne la livraison ?', a: "Nos partenaires livreurs récupèrent les colis directement dans votre boutique. Vous n'avez rien à organiser de votre côté." },
  { q: 'Puis-je vendre depuis mon téléphone ?', a: "Oui, le tableau de bord marchand est accessible sur web et mobile — gérez vos produits et commandes où que vous soyez." },
  { q: "Y a-t-il un nombre minimum de produits pour démarrer ?", a: "Non, vous pouvez commencer avec un seul produit et enrichir votre catalogue à votre rythme." },
]

function Laptop({ children }: { children: ReactNode }) {
  return (
    <div className="w-full">
      <div className="rounded-t-2xl bg-[#1c1c1f] p-3 pb-0">
        <div className="flex justify-center pb-2.5">
          <div className="w-2 h-2 rounded-full bg-[#3a3a42]" />
        </div>
        <div className="rounded-t-lg bg-white overflow-hidden">{children}</div>
      </div>
      <div className="h-3.5 rounded-b-xl bg-gradient-to-b from-[#2c2c30] to-[#1c1c1f]" />
      <div className="h-1.5 w-1/3 mx-auto rounded-b-md bg-[#141416]" />
    </div>
  )
}

function DashboardScreen() {
  return (
    <div className="text-left">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#ebebeb]">
        <span className="text-[13px] font-extrabold text-[#111]">Skignas <span className="font-medium text-[#8a8a90]">· Espace marchand</span></span>
        <span className="text-[11px] text-[#8a8a90]">Commandes récentes</span>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-[#a8a8a2]">
            <th className="font-semibold px-5 py-2">Client</th>
            <th className="font-semibold px-2 py-2">Produit</th>
            <th className="font-semibold px-2 py-2 hidden sm:table-cell">Date</th>
            <th className="font-semibold px-5 py-2 text-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          {ORDER_ROWS.map(row => (
            <tr key={row.client} className="border-t border-[#f0f0ee] text-[11px]">
              <td className="px-5 py-2.5 font-semibold text-[#111] whitespace-nowrap">{row.client}</td>
              <td className="px-2 py-2.5 text-[#6f6f6f] whitespace-nowrap">{row.from}</td>
              <td className="px-2 py-2.5 text-[#8a8a90] hidden sm:table-cell whitespace-nowrap">{row.date}</td>
              <td className="px-5 py-2.5 text-right font-bold text-[#111] whitespace-nowrap">{row.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OrdersScreen() {
  const statuses = [
    { label: 'Livrée',         bg: '#e6f7ec', fg: '#0a8a3a' },
    { label: 'Expédiée',       bg: '#eef5ff', fg: '#1e90ff' },
    { label: 'En préparation', bg: '#fff4e0', fg: '#b8860b' },
    { label: 'Livrée',         bg: '#e6f7ec', fg: '#0a8a3a' },
    { label: 'Annulée',        bg: '#fdeaea', fg: '#c0392b' },
  ]
  return (
    <div className="text-left px-5 py-4 flex flex-col gap-2.5">
      <span className="text-[13px] font-extrabold text-[#111] pb-1">Commandes</span>
      {ORDER_ROWS.map((row, i) => (
        <div key={row.client} className="flex items-center justify-between gap-3 rounded-lg bg-[#fafafa] border border-[#f0f0ee] px-3.5 py-2.5">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-semibold text-[#111] truncate">{row.client}</span>
            <span className="text-[10px] text-[#8a8a90] truncate">{row.from}</span>
          </div>
          <span
            className="shrink-0 text-[9.5px] font-bold px-2 py-1 rounded-full"
            style={{ background: statuses[i].bg, color: statuses[i].fg }}
          >
            {statuses[i].label}
          </span>
        </div>
      ))}
    </div>
  )
}

function StatsScreen() {
  const bars = [38, 62, 44, 78, 56, 90, 68]
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  return (
    <div className="text-left px-5 py-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-extrabold text-[#111]">Chiffre d'affaires</span>
        <span className="text-[15px] font-extrabold text-[#111]">3 240 000 F</span>
      </div>
      <div className="flex items-end gap-2 h-28">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className={`w-full rounded-t-sm ${i === 3 ? 'bg-[#1e90ff]' : 'bg-[#d6e6ff]'}`}
              style={{ height: `${h}%` }}
            />
            <span className="text-[9px] text-[#a8a8a2]">{days[i]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState(0)
  const [walkIndex, setWalkIndex] = useState(0)
  const walk = WALKTHROUGH[walkIndex]
  const walkScreens = [<DashboardScreen key="d" />, <OrdersScreen key="o" />, <StatsScreen key="s" />]

  return (
    <div className="bg-white">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="bg-[#0c0c0c] text-[#f4f4f2]">
        <header className="flex items-center justify-between px-8 lg:px-14 py-5 border-b border-[#262626]">
          <img src="/logo-skignas.png" alt="Skignas" width={130} height={43} decoding="async" className="h-8 w-auto invert" />
          <nav className="hidden md:flex items-center gap-7 text-sm">
            <a href="#avantages" className="text-[#d8d8d8] hover:text-white transition-colors">Avantages</a>
            <a href="#comment-ca-marche" className="text-[#d8d8d8] hover:text-white transition-colors">Comment ça marche</a>
            <a href="#" className="text-[#d8d8d8] hover:text-white transition-colors">Aide</a>
            <Link to="/connexion" className="text-[#d8d8d8] hover:text-white transition-colors">Se connecter</Link>
            <Link to="/inscription" className="bg-[#f4f4f2] text-[#111] rounded-md px-5 py-2.5 text-sm font-bold hover:bg-white transition-colors">
              Devenir marchand
            </Link>
          </nav>
        </header>
      </div>

      {/* ── Héro — photo plein cadre + carte CTA flottante ────── */}
      <section className="relative h-[520px] lg:h-[620px] overflow-hidden">
        <img
          src="/og-1.png"
          alt=""
          width={1910}
          height={823}
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />

        <div className="absolute inset-x-6 lg:inset-x-14 bottom-8 lg:bottom-16 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-xl">
            <h1 className="text-4xl lg:text-[54px] font-extrabold leading-[1.02] tracking-tight text-white">
              Votre boutique.<br />Votre business.<br />Skignas s'occupe du reste.
            </h1>
            <p className="text-[#e0e0e4] text-base lg:text-lg leading-snug mt-5">
              Publiez vos produits, suivez vos commandes et recevez vos paiements.
            </p>
          </div>

          <Link
            to="/inscription"
            className="w-full lg:w-[420px] shrink-0 bg-white rounded-2xl px-8 py-8 flex items-center justify-between gap-5 text-[#0a0a0b] hover:bg-[#f4f4f2] transition-colors"
          >
            <span className="text-lg lg:text-xl font-extrabold leading-snug tracking-tight">
              Créez votre compte et commencez à vendre !
            </span>
            <span className="w-12 h-12 shrink-0 rounded-full bg-[#111] text-white flex items-center justify-center">
              <ArrowRight size={20} />
            </span>
          </Link>
        </div>
      </section>

      {/* ── Avantages ──────────────────────────────────────────── */}
      <section id="avantages" className="px-8 lg:px-14 py-16 lg:py-20 flex flex-col gap-10">
        <h2 className="text-2xl lg:text-[30px] font-extrabold tracking-tight text-[#111]">Pourquoi vendre sur Skignas ?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#ebebeb] border border-[#ebebeb]">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white p-8 flex flex-col gap-3">
              <Icon size={20} className="text-[#111]" strokeWidth={1.75} />
              <span className="text-base font-extrabold text-[#111]">{title}</span>
              <span className="text-[#6f6f6f] text-sm leading-relaxed">{desc}</span>
            </div>
          ))}
        </div>

        {/* ── Comment ça marche ────────────────────────────────── */}
        <div id="comment-ca-marche" className="flex flex-col gap-6 pt-4">
          <h2 className="text-2xl lg:text-[30px] font-extrabold tracking-tight text-[#111]">Comment ça marche</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="flex flex-col gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#111] text-white flex items-center justify-center font-extrabold text-base">
                  {n}
                </div>
                <span className="text-base font-extrabold text-[#111]">{title}</span>
                <span className="text-[#6f6f6f] text-sm leading-relaxed">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fonctionnement ─────────────────────────────────────── */}
      <section className="px-8 lg:px-14 pb-16 lg:pb-20 flex flex-col gap-8">
        <h2 className="text-2xl lg:text-[30px] font-extrabold tracking-tight text-[#111]">Fonctionnement</h2>
        <div className="bg-[#f5f5f3] rounded-3xl p-8 lg:p-14 flex flex-col lg:flex-row gap-10 lg:gap-16 lg:items-center">
          <div className="flex-1 max-w-md flex flex-col gap-5">
            <span className="text-2xl lg:text-[28px] font-extrabold tracking-tight text-[#111]">{walk.title}</span>
            <p className="text-[#4a4a52] text-[15px] leading-relaxed">{walk.desc}</p>
            <div className="flex items-center gap-5 pt-1">
              <span className="text-sm font-bold text-[#6f6f6f]">{walkIndex + 1}/{WALKTHROUGH.length}</span>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setWalkIndex(i => (i - 1 + WALKTHROUGH.length) % WALKTHROUGH.length)}
                  className="w-11 h-11 rounded-full border border-[#111] bg-white hover:bg-[#111] hover:text-white transition-colors flex items-center justify-center"
                  aria-label="Précédent"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setWalkIndex(i => (i + 1) % WALKTHROUGH.length)}
                  className="w-11 h-11 rounded-full border border-[#111] bg-white hover:bg-[#111] hover:text-white transition-colors flex items-center justify-center"
                  aria-label="Suivant"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
          <div className="flex-[1.3]">
            <Laptop>{walkScreens[walkIndex]}</Laptop>
          </div>
        </div>
      </section>

      {/* ── Bandeau inscription (photo + carte) ────────────────── */}
      <section className="px-8 lg:px-14 pb-16 lg:pb-20">
        <div className="flex flex-col lg:flex-row lg:h-[300px] rounded-[28px] lg:rounded-tl-[64px] lg:rounded-br-[64px] overflow-hidden">
          <div className="lg:flex-[0.9] h-56 lg:h-full">
            <img
              src="/og-1.png"
              alt=""
              width={1910}
              height={823}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:flex-1 bg-white p-8 lg:pl-14 lg:pr-16 flex flex-col justify-center gap-8">
            <span className="text-2xl lg:text-[30px] font-extrabold leading-[1.2] tracking-tight text-[#111] max-w-md">
              Inscrivez-vous et commencez à bénéficier des avantages offerts par Skignas
            </span>
            <Link
              to="/inscription"
              className="self-start inline-flex items-center gap-4 bg-[#e5342a] hover:bg-[#c8281f] transition-colors text-white rounded-full pl-8 pr-7 py-4 text-sm font-extrabold tracking-wide uppercase"
            >
              Devenir marchand
              <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Chiffres clés ──────────────────────────────────────── */}
      <section className="bg-[#f5f5f3] px-8 lg:px-14 py-14 lg:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {STATS.map(({ value, label }) => (
            <div key={label} className="flex flex-col gap-1.5 text-center lg:text-left">
              <span className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#111]">{value}</span>
              <span className="text-[#6f6f6f] text-sm leading-snug">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Témoignages ────────────────────────────────────────── */}
      <section className="px-8 lg:px-14 py-16 lg:py-20 flex flex-col gap-10">
        <h2 className="text-2xl lg:text-[30px] font-extrabold tracking-tight text-[#111]">Ils vendent déjà sur Skignas</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map(({ quote, name, shop }) => (
            <div key={name} className="border border-[#ebebeb] rounded-2xl p-7 flex flex-col gap-5">
              <Quote size={22} className="text-[#111]" strokeWidth={1.5} />
              <p className="text-[#33333a] text-[15px] leading-relaxed flex-1">{quote}</p>
              <div className="flex flex-col gap-0.5 pt-2 border-t border-[#f0f0ee]">
                <span className="text-sm font-bold text-[#111]">{name}</span>
                <span className="text-[13px] text-[#8a8a90]">{shop}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section className="bg-[#f5f5f3] px-8 lg:px-14 py-16 lg:py-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          <h2 className="text-2xl lg:text-[30px] font-extrabold tracking-tight text-[#111] text-center">Questions fréquentes</h2>
          <div className="flex flex-col gap-3">
            {FAQS.map((f, i) => {
              const open = openFaq === i
              return (
                <div key={f.q} className="bg-white border border-[#ebebeb] rounded-2xl px-6 py-5">
                  <button
                    onClick={() => setOpenFaq(open ? -1 : i)}
                    className="w-full flex items-center justify-between gap-4 text-left"
                  >
                    <span className="text-[15px] font-semibold text-[#111]">{f.q}</span>
                    {open
                      ? <Minus size={18} className="text-[#111] shrink-0" />
                      : <Plus size={18} className="text-[#111] shrink-0" />}
                  </button>
                  {open && (
                    <p className="text-sm text-[#6f6f6f] leading-relaxed mt-3">{f.a}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA banner ─────────────────────────────────────────── */}
      <section className="bg-[#0c0c0c] text-[#f4f4f2] px-8 lg:px-14 py-12 lg:py-14 flex flex-col sm:flex-row items-center justify-between gap-8">
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <span className="text-2xl lg:text-[28px] font-extrabold tracking-tight">Prêt à développer vos ventes ?</span>
          <span className="text-[#9a9a9a] text-[15px]">Rejoignez plus de 12 500 marchands sur Skignas.</span>
        </div>
        <Link to="/inscription" className="shrink-0 bg-[#f4f4f2] text-[#111] rounded-lg px-8 py-4 text-[15px] font-bold hover:bg-white transition-colors whitespace-nowrap">
          Devenir marchand
        </Link>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 px-8 lg:px-14 py-5 border-t border-[#ebebeb] text-[#9a9a9a] text-[13px]">
        <span>© 2026 Skignas · Espace marchand</span>
        <div className="flex gap-6">
          <a href="#" className="text-[#6f6f6f] hover:text-[#111] transition-colors">Aide &amp; support</a>
          <a href="#" className="text-[#6f6f6f] hover:text-[#111] transition-colors">Conditions d'utilisation</a>
          <a href="#" className="text-[#6f6f6f] hover:text-[#111] transition-colors">Confidentialité</a>
        </div>
      </footer>
    </div>
  )
}
