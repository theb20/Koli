import { cn } from '../../lib/cn'

export type PillTone = 'yellow' | 'lavender' | 'blue' | 'green' | 'pink' | 'gray'

const tones: Record<PillTone, string> = {
  yellow:   'bg-event-yellow',
  lavender: 'bg-event-lavender',
  blue:     'bg-event-blue',
  green:    'bg-event-green',
  pink:     'bg-event-pink',
  gray:     'bg-event-gray',
}

/** Pilule pastel de statut — texte toujours en encre (contraste AA). */
export function StatusPill({ tone, children, className }: { tone: PillTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center h-6 px-2.5 rounded-full text-caption font-medium text-ink whitespace-nowrap', tones[tone], className)}>
      {children}
    </span>
  )
}

/* ── Statuts métier → couleur + libellé (commandes, retours, sourcing…) ── */
const STATUS: Record<string, [PillTone, string]> = {
  pending: ['yellow', 'En attente'], confirmed: ['lavender', 'Confirmée'], processing: ['lavender', 'En préparation'],
  shipped: ['blue', 'Expédiée'], delivered: ['green', 'Livrée'], cancelled: ['pink', 'Annulée'], refunded: ['gray', 'Remboursée'],
  paid: ['green', 'Payé'], failed: ['pink', 'Échoué'],
  hot: ['pink', 'Hot'], new: ['blue', 'Nouveau'], sale: ['pink', 'Promo'], top: ['yellow', 'Top'],
  admin: ['lavender', 'Admin'], customer: ['gray', 'Client'], seller: ['blue', 'Marchand'],
  active: ['green', 'Actif'], inactive: ['gray', 'Inactif'], published: ['green', 'Publié'], draft: ['gray', 'Brouillon'],
  quoted: ['lavender', 'Devis envoyé'], fulfilled: ['green', 'Traitée'], rejected: ['pink', 'Refusée'],
  accepted: ['yellow', 'Acceptée · paiement en attente'], declined: ['gray', 'Refusée par le client'], expired: ['yellow', 'Devis expiré'],
  requested: ['yellow', 'Demandé'], approved: ['blue', 'Approuvé'], received: ['lavender', 'Reçu'],
  success: ['green', 'Synchronisé'], running: ['blue', 'En cours'], skipped: ['gray', 'Ignoré'],
  submitted: ['yellow', 'Soumis'], pending_review: ['lavender', 'En revue'],
}

/** Badge historique (pages existantes) — rendu désormais en pilule pastel. */
export function Badge({ label, color }: { label: string; color?: string }) {
  const [tone, text] = STATUS[color ?? label] ?? ['gray', label]
  return <StatusPill tone={tone}>{STATUS[label]?.[1] ?? text}</StatusPill>
}
