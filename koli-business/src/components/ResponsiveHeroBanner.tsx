import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react'
import VaporizeTextCycle from './VaporizeTextCycle'

/* ─────────────────────────────────────────────────────────────
   Héro plein écran de l'espace marchand — en-tête (logo + menu) et
   accroche, sur la photo de fond du site. Adapté du composant
   « ResponsiveHeroBanner » (21st.dev) : contenus Skignas, liens internes
   via React Router, menu mobile réellement ouvert/fermé, rangée
   « partenaires » remplacée par les moyens de versement (en texte).
───────────────────────────────────────────────────────────── */

type NavLink = { label: string; href: string; external?: boolean }

type Props = {
  logoUrl?: string
  backgroundImageUrl?: string
  navLinks?: NavLink[]
  ctaButtonText?: string
  ctaButtonHref?: string
  badgeLabel?: string
  badgeText?: string
  /** Phrases du titre animé, affichées l'une après l'autre (h1 = leur concaténation). */
  titleCycle?: string[]
  description?: string
  primaryButtonText?: string
  primaryButtonHref?: string
  secondaryButtonText?: string
  secondaryButtonHref?: string
  partnersTitle?: string
  partners?: { name: string; iconPay: string }[]
}



/** Lien interne (React Router), ancre (#…) ou externe (autre domaine). */
function SmartLink({ href, className, children, onClick }: { href: string; className: string; children: React.ReactNode; onClick?: () => void }) {
  if (href.startsWith('/') && !href.startsWith('//')) return <Link to={href} className={className} onClick={onClick}>{children}</Link>
  return <a href={href} className={className} onClick={onClick}>{children}</a>
}

export default function ResponsiveHeroBanner({
  logoUrl = '/logo-skignas.png',
  backgroundImageUrl = '/og-1.png',
  navLinks = [
    { label: 'Avantages', href: '#avantages' },
    { label: 'Comment ça marche', href: '#comment-ca-marche' },
    { label: 'Tarifs', href: '#tarifs' },
    { label: 'Se connecter', href: 'https://me.skignas.com/connexion', external: true },
  ],
  ctaButtonText = 'Devenir marchand',
  ctaButtonHref = '/inscription',
  badgeLabel = 'Gratuit',
  badgeText = "0 F CFA à l'inscription, commission uniquement sur vos ventes",
  titleCycle = ['Votre boutique.', 'Votre business.', "Skignas s'occupe du reste."],
  description = 'Publiez vos produits en moins de 2 minutes, suivez vos commandes en temps réel et recevez vos paiements sous 48 h — depuis un seul tableau de bord, sur web et mobile.',
  primaryButtonText = 'Créer ma boutique',
  primaryButtonHref = '/inscription',
  secondaryButtonText = 'Voir comment ça marche',
  secondaryButtonHref = '#comment-ca-marche',
  partnersTitle = 'Vos gains versés sous 48 h via',
  partners = 
    [{ name: 'Wave', iconPay: '/items/wave.png' },
      { name: 'Orange Money', iconPay: '/items/orangemoney.png' },
      { name: 'MTN Money', iconPay: '/items/mtnmoney.png' },
      { name: 'Virement bancaire', iconPay: '/items/cb.png' },
    ],
}: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const close = () => setMobileMenuOpen(false)

  return (
    <section className="w-full isolate min-h-[100svh] overflow-hidden relative bg-[#0c0c0c]">
      <img
        src={backgroundImageUrl}
        alt=""
        width={1910}
        height={823}
        decoding="async"
        fetchPriority="high"
        className="w-full h-full object-cover object-[65%_center] absolute inset-0 -z-10"
      />
      {/* Voile : texte blanc lisible quel que soit l'endroit de la photo */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/75 via-black/55 to-black/80" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-black/30" />

      <header className="z-20 relative xl:top-4">
        <div className="mx-6 lg:mx-14">
          <div className="flex items-center justify-between pt-5">
            <Link to="/" aria-label="Skignas — accueil espace marchand" className="inline-flex items-center">
              <img 
                src={logoUrl} 
                alt="Skignas" 
                width={130} 
                height={43} 
                decoding="async" 
                className="h-8 w-auto invert"
              />
            </Link>

            <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-full bg-white/5 px-1 py-1 ring-1 ring-white/10 backdrop-blur">
                {navLinks.map(link => (
                  <SmartLink key={link.label} href={link.href}
                    className="px-3 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors">
                    {link.label}
                  </SmartLink>
                ))}
                <SmartLink href={ctaButtonHref}
                  className="ml-1 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-bold text-neutral-900 hover:bg-white/90 transition-colors">
                  {ctaButtonText}
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                </SmartLink>
              </div>
            </nav>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(o => !o)}
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur"
              aria-expanded={mobileMenuOpen}
              aria-controls="hero-mobile-menu"
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {mobileMenuOpen ? <X className="h-5 w-5 text-white/90" aria-hidden /> : <Menu className="h-5 w-5 text-white/90" aria-hidden />}
            </button>
          </div>

          {mobileMenuOpen && (
            <nav id="hero-mobile-menu" aria-label="Navigation principale"
              className="md:hidden mt-3 rounded-2xl bg-black/70 ring-1 ring-white/15 backdrop-blur p-2 flex flex-col">
              {navLinks.map(link => (
                <SmartLink key={link.label} href={link.href} onClick={close}
                  className="px-4 py-3 rounded-xl text-[15px] font-medium text-white/90 hover:bg-white/10 transition-colors">
                  {link.label}
                </SmartLink>
              ))}
              <SmartLink href={ctaButtonHref} onClick={close}
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[15px] font-bold text-neutral-900">
                {ctaButtonText}
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </SmartLink>
            </nav>
          )}
        </div>
      </header>

      <div className="z-10 relative">
        <div className="max-w-7xl mx-auto px-6 pt-20 sm:pt-28 md:pt-32 lg:pt-36 pb-16">
          <div className="mx-auto max-w-5xl text-center">

            <div className="mb-6 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-2xl sm:rounded-full bg-white/10 px-2.5 py-2 ring-1 ring-white/15 backdrop-blur animate-fade-slide-in-1">
              <span className="inline-flex items-center text-xs font-bold text-neutral-900 bg-white/90 rounded-full py-0.5 px-2">
                {badgeLabel}
              </span>
              <span className="text-sm font-medium text-white/90 pr-1">{badgeText}</span>
            </div>

            {/* Titre principal : les phrases se vaporisent l'une après l'autre (canvas).
                Un vrai <h1> invisible porte le texte complet pour le SEO et les
                lecteurs d'écran ; texte normal si l'utilisateur réduit les animations. */}
            <div className="animate-fade-slide-in-2">
              <VaporizeTextCycle
                tag="h1"
                texts={titleCycle}
                font={{ fontFamily: 'Archivo, Helvetica, Arial, sans-serif', fontWeight: 400, maxFontSize: 72, minFontSize: 30 }}
                color="rgb(255, 255, 255)"
                spread={5}
                density={5}
                animation={{ vaporizeDuration: 2, fadeInDuration: 1, waitDuration: 2.2 }}
                direction="left-to-right"
                alignment="center"
                fallbackClassName="text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight text-white tracking-tight font-normal"
              />
            </div>

            <p className="text-base sm:text-lg text-white/85 max-w-2xl mt-6 mx-auto animate-fade-slide-in-3">
              {description}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-10 items-center justify-center animate-fade-slide-in-4">

              <SmartLink href={primaryButtonHref}
                className="inline-flex items-center gap-2 rounded-full bg-white py-3 px-6 text-sm font-bold text-neutral-900 hover:bg-white/90 transition-colors">
                {primaryButtonText}
                <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </SmartLink>

              <SmartLink href={secondaryButtonHref}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 py-3 px-5 text-sm font-medium text-white hover:bg-white/15 transition-colors">
                {secondaryButtonText}
                <ChevronDown className="h-4 w-4" aria-hidden />
              </SmartLink>

            </div>
          </div>

          {partners.length > 0 && (
            <div className="mx-auto mt-20 max-w-5xl">
              <p className="text-sm text-white/70 text-center animate-fade-slide-in-1">{partnersTitle}</p>
              <ul className="mt-6 flex flex-wrap items-center justify-center gap-3 animate-fade-slide-in-2">
                {partners.map(name => (
                  <li key={name.name}
                    className="inline-flex items-center backdrop-blur px-4 py-2 text-sm font-semibold text-white/85">
                    <img src={name.iconPay} alt={name.name} width={24} height={24} className="h-4 w-4 mr-1" />
                    {name.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
