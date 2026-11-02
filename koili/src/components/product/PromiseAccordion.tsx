import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

const ITEMS: { title: string; body: string }[] = [
  {
    title: 'Retours gratuits sous 14 jours',
    body: 'Produit non conforme ou défectueux ? Renvoyez-le sous 14 jours. Frais de retour offerts si le défaut est avéré, remboursement via le même moyen de paiement.',
  },
  {
    title: 'Assistance clientèle',
    body: 'Une question avant ou après votre achat ? Notre équipe répond par WhatsApp et e-mail aux horaires affichés sur la page Contact.',
  },
  {
    title: 'Garantie constructeur',
    body: 'Ce produit est couvert par la garantie du fabricant. Les conditions exactes (durée, pièces couvertes) sont précisées par le vendeur sur la fiche ou à la livraison.',
  },
]

export function PromiseAccordion() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="divide-y divide-border">
      {ITEMS.map((item, i) => (
        <div key={item.title}>
          <button
            onClick={() => setOpen(o => o === i ? null : i)}
            className="w-full flex items-center justify-between py-3.5 text-left"
          >
            <span className="text-sm font-semibold text-ink">{item.title}</span>
            <ChevronDown size={16} className={`text-muted transition-transform ${open === i ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <p className="text-sm text-muted leading-relaxed pb-4">{item.body}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
