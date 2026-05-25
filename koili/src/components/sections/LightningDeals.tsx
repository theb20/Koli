import { useMemo } from 'react'
import { Zap } from 'lucide-react'
import { LIGHTNING_DEALS } from '../../constants/deals'
import { ProductCard } from '../ui/ProductCard'
import { CountdownTimer } from '../ui/CountdownTimer'

export function LightningDeals() {
  const dealEnd = useMemo(() => Date.now() + 108 * 3_600_000 + 20 * 60_000 + 38_000, [])

  return (
    <section className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Flash Deals</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 hidden sm:block">Ends in:</span>
          <CountdownTimer targetMs={dealEnd} />
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {LIGHTNING_DEALS.map((deal) => (
            <ProductCard key={deal.id} deal={deal} />
          ))}
        </div>
      </div>
    </section>
  )
}
