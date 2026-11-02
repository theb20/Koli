import { MessageCircleQuestion } from 'lucide-react'

/**
 * Questions & réponses — aucun backend ne stocke de Q&A produit aujourd'hui.
 * On affiche la section (ordre imposé par le design) avec un état vide
 * honnête plutôt qu'un champ de saisie qui ne pourrait rien enregistrer.
 */
export function QnA() {
  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-ink mb-1">Questions & réponses</h2>
      <p className="text-sm text-muted mb-6">Une question ? Contactez le service client, nous vous répondons rapidement.</p>

      <div className="flex flex-col items-center gap-3 py-10 text-center rounded-xl bg-base">
        <MessageCircleQuestion size={28} className="text-muted" />
        <p className="text-sm text-muted">Aucune question publiée pour l'instant sur ce produit.</p>
      </div>
    </div>
  )
}
