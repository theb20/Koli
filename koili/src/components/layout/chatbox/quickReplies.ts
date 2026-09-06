/* ─────────────────────────────────────────────────────────────
   Réponses rapides contextuelles — dépendent de la page où se trouve le
   client, pas d'une liste figée. Toujours 3 maximum pour rester scannable.
───────────────────────────────────────────────────────────── */
export function getQuickReplies(pathname: string): string[] {
  if (pathname.startsWith('/catalogue/')) {
    return ['Ce produit est-il disponible ?', 'Quand serai-je livré ?', 'Quels moyens de paiement ?']
  }
  if (pathname.startsWith('/panier')) {
    return ['Problème de paiement', 'Livraison', "Besoin d'aide"]
  }
  if (pathname.startsWith('/commandes')) {
    return ['Suivre ma commande', 'Retourner un produit', 'Contacter un conseiller']
  }
  return ['Trouver un produit', 'Voir les promotions', 'Suivre ma commande']
}
