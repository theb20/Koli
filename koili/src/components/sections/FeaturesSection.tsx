import { Truck, ShieldCheck, Headphones, CreditCard, type LucideIcon } from 'lucide-react'
import { FEATURES } from '../../constants/features'

const ICON_MAP: Record<string, LucideIcon> = {
  Truck,
  ShieldCheck,
  Headphones,
  CreditCard,
}

export function FeaturesSection() {
  return (
    <section className="border-t border-b border-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {FEATURES.map((feature) => {
            const Icon = ICON_MAP[feature.iconName]
            return (
              <div key={feature.id} className="flex items-center gap-4">
                <div className="text-gray-500 shrink-0">
                  <Icon size={38} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm leading-tight">{feature.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{feature.subtitle}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
