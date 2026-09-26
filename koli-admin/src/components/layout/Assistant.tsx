import { AnimatePresence, motion } from 'motion/react'
import { MessageSquareText, Sparkles, X } from 'lucide-react'
import { EmptyState } from '../ui/States'

/** Bouton flottant « Assistant » — 52px, vert forêt, en bas à droite. */
export function AssistantFab({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Ouvrir l'assistant Skignas"
      className="fixed right-6 bottom-6 z-40 w-[52px] h-[52px] rounded-full bg-primary text-on-primary shadow-fab flex items-center justify-center hover:bg-primary-hover transition-colors">
      <MessageSquareText size={22} strokeWidth={1.75} />
    </button>
  )
}

const EXAMPLES = [
  'Quelles commandes sont en retard ?',
  'Résume les ventes de la semaine',
  'Rédige une réponse à cet avis',
  'Quels produits réapprovisionner ?',
]

/**
 * Panneau de l'assistant IA (420px). Branché en Phase 7 — d'ici là, il
 * annonce clairement que la fonctionnalité arrive, sans fausse réponse.
 */
export function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside role="dialog" aria-label="Assistant Skignas"
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed right-6 bottom-[92px] z-40 w-[min(420px,calc(100vw-48px))] max-h-[min(640px,calc(100vh-120px))] flex flex-col rounded-card border border-line bg-card shadow-popover">
          <div className="flex items-center justify-between h-14 px-[22px] border-b border-line shrink-0">
            <p className="flex items-center gap-2 text-body font-semibold text-ink"><Sparkles size={16} className="text-primary" /> Assistant Skignas</p>
            <button type="button" onClick={onClose} aria-label="Fermer l'assistant"
              className="w-8 h-8 inline-flex items-center justify-center rounded-full border border-line text-ink-2 hover:bg-hover-fill"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-[22px]">
            <EmptyState icon={<Sparkles size={22} />} title="Bientôt disponible"
              text="L'assistant IA pourra analyser vos commandes, ventes et avis, et répondre avec des liens directs vers les éléments concernés." />
            <p className="text-caption text-muted mb-2">Exemples de questions :</p>
            <ul className="space-y-2">
              {EXAMPLES.map(q => (
                <li key={q} className="px-3 py-2.5 rounded-nav bg-muted-fill text-secondary text-ink-2">{q}</li>
              ))}
            </ul>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
