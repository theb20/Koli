import { useId } from 'react'
import { Info } from 'lucide-react'

/**
 * Infobulle « ⓘ » : s'ouvre au survol ET au focus clavier/tap (focus-within).
 * La bulle se positionne sur le plus proche ancêtre `relative` (la cellule
 * de l'indicateur), pour rester dans sa largeur sans déborder de l'écran.
 */
export function InfoTip({ text, label }: { text: string; label: string }) {
  const id = useId()
  return (
    <span className="group/tip inline-flex">
      <button type="button" aria-label={`Comment est calculé : ${label}`} aria-describedby={id}
        className="text-muted hover:text-ink-2 focus-visible:text-ink-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
        <Info size={13} aria-hidden />
      </button>
      <span role="tooltip" id={id}
        className="hidden group-hover/tip:block group-focus-within/tip:block absolute left-0 right-0 bottom-full mb-1.5 z-30 min-w-[200px] rounded-input bg-ink text-card text-caption leading-snug px-3 py-2 shadow-[var(--popover-shadow)] pointer-events-none">
        {text}
      </span>
    </span>
  )
}
