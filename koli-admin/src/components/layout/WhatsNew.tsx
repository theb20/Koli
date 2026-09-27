import { useEffect, useRef, useState } from 'react'
import { Gift } from 'lucide-react'
import { IconButton } from '../ui/Button'

/**
 * « Nouveautés » — journal des dernières évolutions du backoffice. Contenu
 * réel et statique (maintenu à chaque mise en ligne), pas des données.
 */
const RELEASES: { date: string; title: string; text: string }[] = [
  { date: 'Sept. 2026', title: 'Nouveau design du backoffice', text: 'Navigation groupée, palette ⌘K, mode sombre.' },
  { date: 'Sept. 2026', title: 'Avis après livraison', text: 'Lien « Laisser un avis » envoyé automatiquement à chaque commande livrée.' },
  { date: 'Sept. 2026', title: 'Devis de sourcing en ligne', text: 'Le client accepte et paie son devis, ou le refuse, depuis un lien.' },
  { date: 'Sept. 2026', title: 'Assistance technique payante', text: 'Option activable par produit, 10 000 F CFA par défaut.' },
]

export function WhatsNew() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <IconButton label="Nouveautés" icon={<Gift size={16} strokeWidth={1.5} />} aria-expanded={open} onClick={() => setOpen(o => !o)} />
      {open && (
        <div role="dialog" aria-label="Nouveautés"
          className="absolute right-0 top-full mt-2 w-80 rounded-card border border-line bg-card shadow-popover p-4 z-50">
          <p className="text-body font-semibold text-ink mb-3">Nouveautés</p>
          <ul className="space-y-3">
            {RELEASES.map(r => (
              <li key={r.title}>
                <p className="text-micro text-muted">{r.date}</p>
                <p className="text-secondary font-medium text-ink">{r.title}</p>
                <p className="text-caption text-ink-2">{r.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
