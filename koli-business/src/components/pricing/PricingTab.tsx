import type { PaymentFrequency } from './pricing'
import { FREQUENCY_LABELS } from './pricing'

/** Onglet Mensuel / Annuel — pastille blanche sous l'onglet actif (transition CSS). */
export function Tab({ frequency, selected, setSelected, discount }: {
  frequency: PaymentFrequency
  selected: boolean
  setSelected: (f: PaymentFrequency) => void
  /** % d'économie affiché à côté de l'onglet annuel */
  discount?: number | null
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => setSelected(frequency)}
      className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
        selected ? 'bg-white text-[#111] shadow-sm' : 'text-[#6f6f6f] hover:text-[#111]'
      }`}
    >
      {FREQUENCY_LABELS[frequency]}
      {discount != null && (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${selected ? 'bg-[#111] text-white' : 'bg-[#e4e4e0] text-[#111]'}`}>
          −{discount} %
        </span>
      )}
    </button>
  )
}
