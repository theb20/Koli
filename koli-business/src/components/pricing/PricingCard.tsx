import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { formatAmount, formatXof, type PaymentFrequency, type PricingTier } from './pricing'

export function PricingCard({ tier, paymentFrequency }: { tier: PricingTier; paymentFrequency: PaymentFrequency }) {
  const price = tier.price[paymentFrequency]
  const free = tier.price.monthly === 0 && tier.price.yearly === 0
  const hl = tier.highlighted

  return (
    <div className={`relative flex flex-col gap-7 rounded-2xl p-7 ${hl ? 'bg-[#0c0c0c] text-white ring-1 ring-[#0c0c0c]' : 'bg-white border border-[#ebebeb] text-[#111]'}`}>
      {tier.popular && (
        <span className="absolute -top-3 left-7 rounded-full bg-[#c8281f] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          Recommandé
        </span>
      )}

      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-extrabold">{tier.name}</h3>
        <p className={`text-[13px] ${hl ? 'text-[#c8c8ce]' : 'text-[#6f6f6f]'}`}>{tier.description}</p>
      </div>

      <div className="flex flex-col gap-1 min-h-[64px]">
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          {/* Montant en grand, devise et période en petit : « 1 000 000 » tient dans une carte étroite */}
          <span key={`${tier.id}-${paymentFrequency}`} className="text-3xl font-extrabold tracking-tight tabular-nums whitespace-nowrap animate-[fade-slide-in_0.3s_ease-out]">
            {free ? 'Gratuit' : formatAmount(price)}
          </span>
          {!free && <span className={`text-sm font-semibold whitespace-nowrap ${hl ? 'text-[#c8c8ce]' : 'text-[#6f6f6f]'}`}>F CFA {paymentFrequency === 'monthly' ? '/mois' : '/an'}</span>}
        </div>
        {!free && paymentFrequency === 'yearly' && (
          <span className={`text-[13px] ${hl ? 'text-[#c8c8ce]' : 'text-[#6f6f6f]'}`}>soit {formatXof(Math.round(price / 12))}/mois</span>
        )}
        {free && <span className={`text-[13px] ${hl ? 'text-[#c8c8ce]' : 'text-[#6f6f6f]'}`}>Sans abonnement, sans engagement</span>}
      </div>

      <ul className="flex flex-col gap-2.5 flex-1">
        {tier.features.map(f => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <Check size={16} strokeWidth={2.5} className={`shrink-0 mt-0.5 ${hl ? 'text-white' : 'text-[#111]'}`} aria-hidden />
            <span className={hl ? 'text-[#e0e0e4]' : 'text-[#4a4a52]'}>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        to={tier.href}
        className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-center text-sm leading-tight font-extrabold transition-colors ${
          hl ? 'bg-white text-[#111] hover:bg-[#f4f4f2]' : 'bg-black text-white hover:bg-[#c8281f]'
        }`}
      >
        {tier.cta}
        <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
      </Link>
    </div>
  )
}
