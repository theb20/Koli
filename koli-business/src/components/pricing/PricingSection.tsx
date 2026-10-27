import { useState } from 'react'
import { PricingCard } from './PricingCard'
import { Tab } from './PricingTab'
import { yearlySavingPct, type PaymentFrequency, type PricingTier } from './pricing'

/* Nombre de colonnes sur grand écran selon le nombre de plans (classes
   Tailwind littérales : une classe construite dynamiquement ne serait pas générée). */
const XL_COLS: Record<number, string> = { 1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4', 5: 'xl:grid-cols-5' }

export function PricingSection({ id, title, subtitle, tiers, frequencies = ['monthly', 'yearly'] }: {
  id?: string
  title: string
  subtitle: string
  tiers: PricingTier[]
  frequencies?: PaymentFrequency[]
}) {
  const [selectedFrequency, setSelectedFrequency] = useState<PaymentFrequency>(frequencies[0]!)
  // Meilleure économie annuelle réelle des plans affichés (aucun chiffre en dur)
  const savings = tiers.map(t => yearlySavingPct(t.price.monthly, t.price.yearly)).filter((p): p is number => p != null)
  const discount = savings.length ? Math.max(...savings) : null

  return (
    <section id={id} className="px-8 lg:px-14 py-16 lg:py-20 flex flex-col items-center gap-10">
      <div className="flex flex-col items-center gap-7 text-center">
        <div className="flex flex-col gap-3 max-w-2xl">
          <h2 className="text-2xl lg:text-[30px] font-extrabold tracking-tight text-[#111]">{title}</h2>
          <p className="text-[#6f6f6f] text-[15px] leading-relaxed">{subtitle}</p>
        </div>
        {frequencies.length > 1 && (
          <div role="radiogroup" aria-label="Facturation" className="mx-auto flex w-fit rounded-full bg-[#f0f0ed] p-1">
            {frequencies.map(freq => (
              <Tab key={freq} frequency={freq} selected={selectedFrequency === freq}
                setSelected={setSelectedFrequency} discount={freq === 'yearly' ? discount : null} />
            ))}
          </div>
        )}
      </div>

      <div className={`grid w-full gap-6 pt-3 sm:grid-cols-2 lg:grid-cols-3 ${XL_COLS[tiers.length] ?? 'xl:grid-cols-4'}`}>
        {tiers.map(tier => <PricingCard key={tier.id} tier={tier} paymentFrequency={selectedFrequency} />)}
      </div>
    </section>
  )
}
