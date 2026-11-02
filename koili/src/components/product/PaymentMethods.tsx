import { CreditCard, Banknote } from 'lucide-react'

/**
 * Moyens de paiement réellement acceptés — reflète les gateways exposées par
 * GeniusPay côté merchantgo (wave / orange_money / mtn_money / card). Ne pas
 * ajouter PayPal, Apple Pay ou Moov tant qu'ils ne sont pas câblés côté
 * merchantgo : afficher un logo pour un moyen non fonctionnel trompe le client.
 */
const METHODS = [
  { label: 'Wave', bg: '#1DC9DC', fg: '#ffffff' },
  { label: 'Orange Money', bg: '#FF7900', fg: '#ffffff' },
  { label: 'MTN MoMo', bg: '#FFCC00', fg: '#111111' },
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
            {m.label}
          </span>
        ))}
        <span className="h-6 px-2 rounded border border-border flex items-center gap-1 text-[11px] font-semibold text-ink bg-surface">
          <CreditCard size={12} /> Carte bancaire
        </span>
        {codEnabled && (
          <span className="h-6 px-2 rounded border border-border flex items-center gap-1 text-[11px] font-semibold text-ink bg-surface">
            <Banknote size={12} /> Paiement à la livraison
          </span>
        )}
      </div>
    </div>
  )
}
