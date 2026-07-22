import { useState } from 'react'
import { Zap, ShieldCheck, LineChart, Truck, Wallet, Headset, ArrowRight, Plus, Minus, Quote } from 'lucide-react'

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

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <div className="bg-white">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="bg-[#0c0c0c] text-[#f4f4f2]">
        <header className="flex items-center justify-between px-8 lg:px-14 py-5 border-b border-[#262626]">
          <img src="/logo-skignas.png" alt="Skignas" className="h-8 w-auto invert" />
          <nav className="hidden md:flex items-center gap-7 text-sm">
            <a href="#avantages" className="text-[#d8d8d8] hover:text-white transition-colors">Avantages</a>
            <a href="#comment-ca-marche" className="text-[#d8d8d8] hover:text-white transition-colors">Comment ça marche</a>
            <a href="#" className="text-[#d8d8d8] hover:text-white transition-colors">Aide</a>
            <a href="#" className="text-[#d8d8d8] hover:text-white transition-colors">Se connecter</a>
            <a href="#" className="bg-[#f4f4f2] text-[#111] rounded-md px-5 py-2.5 text-sm font-bold hover:bg-white transition-colors">
              Devenir marchand
            </a>
          </nav>
        </header>
      </div>

      {/* ── Héro — photo plein cadre + carte CTA flottante ────── */}
      <section className="relative h-[520px] lg:h-[620px] overflow-hidden">
        <img src="/og-1.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
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

          <a
            href="#"
            className="w-full lg:w-[420px] shrink-0 bg-white rounded-2xl px-8 py-8 flex items-center justify-between gap-5 text-[#0a0a0b] hover:bg-[#f4f4f2] transition-colors"
          >
            <span className="text-lg lg:text-xl font-extrabold leading-snug tracking-tight">
              Créez votre compte et commencez à vendre !
            </span>
            <span className="w-12 h-12 shrink-0 rounded-full bg-[#111] text-white flex items-center justify-center">
              <ArrowRight size={20} />
            </span>
          </a>
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
        <a href="#" className="shrink-0 bg-[#f4f4f2] text-[#111] rounded-lg px-8 py-4 text-[15px] font-bold hover:bg-white transition-colors whitespace-nowrap">
          Devenir marchand
        </a>
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
