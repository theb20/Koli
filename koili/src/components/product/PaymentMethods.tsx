import { CreditCard, Banknote } from 'lucide-react'

/**
 * Moyens de paiement réellement acceptés — reflète les gateways exposées par
 * GeniusPay côté merchantgo (wave / orange_money / mtn_money / card). Ne pas
 * ajouter PayPal, Apple Pay ou Moov tant qu'ils ne sont pas câblés côté
 * merchantgo : afficher un logo pour un moyen non fonctionnel trompe le client.
 */
const METHODS = [
  { label: 'Wave', bg: '#1DC9DC', fg: '#ffffff', img: '/icons/wave.png' },
  { label: 'Orange Money', bg: '#FF7900', fg: '#ffffff', img: '/icons/orange.png' },
  { label: 'MTN MoMo', bg: '#FFCC00', fg: '#111111', img: '/icons/mtn.png' },
]

export function PaymentMethods({ codEnabled }: { codEnabled?: boolean }) {
  return (
    <div>
      <p className="text-sm font-bold text-ink mb-2.5">Nous acceptons</p>
      <div className="flex items-center gap-2 flex-wrap">
        {METHODS.map(m => (
          <span
            key={m.label}
            className="h-6 px-2 rounded border border-border flex items-center text-[11px] font-semibold"
            style={{ background: m.bg, color: m.fg }}
          >
            <img src={m.img} alt={m.label} className="h-4" />
          </span>
        ))}
        <span className="h-6 px-2 rounded border border-border flex items-center gap-1 text-[11px] font-semibold text-ink bg-surface">
          <img src="/icons/cd.png" alt="cb" className="h-4" />
        </span>
        {codEnabled && (
          <span className="h-6 px-2 rounded border border-border flex items-center gap-1 text-[11px] font-semibold text-ink bg-surface">
            <img src="/icons/cod.png" alt="cod" className="h-4" />
          </span>
        )}
      </div>
    </div>
  )
}
