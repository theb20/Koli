import { Zap, ShieldCheck, LineChart, Truck, Wallet, Headset } from 'lucide-react'

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

function DashboardGlyph() {
  return (
    <div className="w-full max-w-[440px] aspect-[4/3] rounded-2xl bg-[#141416] border border-[#26262b] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="h-2.5 w-24 rounded-full bg-[#3a3a42]" />
        <div className="h-7 w-20 rounded-lg bg-[#1e90ff]" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-xl bg-[#1a1a1f] border border-[#26262b] p-3 flex flex-col gap-2">
            <div className="h-1.5 w-10 rounded-full bg-[#4a4a52]" />
            <div className="h-3 w-14 rounded-full bg-[#e5e5e2]" />
          </div>
        ))}
      </div>
      <div className="flex-1 rounded-xl bg-[#1a1a1f] border border-[#26262b] p-4 flex items-end gap-2.5">
        {[38, 62, 44, 78, 56, 90, 68].map((h, i) => (
          <div key={i} className="flex-1 rounded-t-sm bg-[#1e90ff]/70" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* ── Header + Hero (bloc noir) ─────────────────────────── */}
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

        <section className="flex flex-col lg:flex-row items-center gap-12 px-8 lg:px-14 py-16 lg:py-20">
          <div className="flex-1 flex flex-col gap-6 max-w-xl">
            <h1 className="text-4xl lg:text-[54px] font-extrabold leading-[1.05] tracking-tight">
              Votre boutique.<br />Votre business.<br />Skignas s'occupe du reste.
            </h1>
            <p className="text-[#9a9a9a] text-base lg:text-[17px] leading-relaxed max-w-md">
              Publiez vos produits, suivez vos commandes et recevez vos paiements — depuis un seul tableau de bord, sur web et mobile.
            </p>
            <div className="flex flex-wrap gap-3.5">
              <a href="#" className="bg-[#f4f4f2] text-[#111] rounded-lg px-7 py-3.5 text-[15px] font-bold hover:bg-white transition-colors">
                Ouvrir ma boutique
              </a>
              <a href="#" className="border border-[#3a3a3a] text-[#f4f4f2] rounded-lg px-7 py-3.5 text-[15px] font-semibold hover:border-[#f4f4f2] transition-colors">
                Se connecter
              </a>
            </div>
            <div className="flex gap-9 pt-2">
              {[
                ['12 500+', 'marchands'],
                ['48 h', 'versement max'],
                ['24/7', 'support dédié'],
              ].map(([value, label]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-2xl font-extrabold">{value}</span>
                  <span className="text-[#9a9a9a] text-[13px]">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 flex justify-center lg:justify-end w-full">
            <DashboardGlyph />
          </div>
        </section>
      </div>

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
