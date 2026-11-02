import { prisma } from './prisma'

/**
 * Nom de zone réservé pour tout ce qui n'est pas une commune d'Abidjan — le
 * marchand règle un seul tarif "Intérieur du pays" plutôt qu'une zone par
 * ville (cohérent avec la liste VILLES_CI du frontend : "Abidjan – X" pour
 * chaque commune, "Autres villes" regroupées sous ce nom unique).
 */
export const UPCOUNTRY_ZONE_NAME = 'Intérieur du pays'

/** `"Abidjan – Cocody"` → elle-même (zone par commune) ; toute autre ville → la zone groupée unique. */
function zoneKeyForVille(ville: string): string {
  const v = ville.trim()
  return v.toLowerCase().startsWith('abidjan') ? v : UPCOUNTRY_ZONE_NAME
}

export type CartLineForShipping = { storeId: number | null; price: number; qty: number }

export type ShippingQuote = {
  cost: number
  /** false si au moins une zone concernée refuse le paiement à la livraison pour cette ville. */
  codAllowed: boolean
  /**
   * Boutiques dont au moins une zone est configurée mais dont aucune ne
   * couvre cette ville — ces marchands ne livrent pas là, l'appelant doit
   * refuser la commande plutôt que de facturer un tarif approximatif.
   */
  unmatchedStoreIds: number[]
}

/** Comportement plateforme historique (sans zone marchand) — inchangé, voir orders.ts. */
export function platformFallbackShipping(deliveryMethod: 'standard' | 'express', subtotal: number): number {
  if (deliveryMethod === 'express') return 3_500
  return subtotal >= 25_000 ? 0 : 1_500
}

/**
 * Calcule le coût de livraison total et l'éligibilité au paiement à la
 * livraison d'un panier, boutique par boutique :
 * — items sans storeId (catalogue Skignas) : tarif plateforme inchangé ;
 * — items d'une boutique sans zone configurée : tarif plateforme par défaut
 *   pour cette boutique (dégradation gracieuse, rien ne casse pour les
 *   marchands qui n'ont pas encore configuré leurs zones) ;
 * — items d'une boutique avec zones configurées : tarif de la zone dont le
 *   nom correspond à `ville` (comparaison insensible à la casse/espaces) —
 *   si aucune ne correspond, la boutique ne livre pas là (unmatchedStoreIds).
 */
export async function quoteShipping(
  items: CartLineForShipping[],
  ville: string,
  deliveryMethod: 'standard' | 'express',
): Promise<ShippingQuote> {
  const storeIds = [...new Set(items.map(i => i.storeId).filter((id): id is number => id != null))]
  const zones = storeIds.length
    ? await prisma.deliveryZone.findMany({ where: { storeId: { in: storeIds }, isActive: true } })
    : []

  const normalizedKey = zoneKeyForVille(ville).toLowerCase()
  let cost = 0
  let codAllowed = true
  const unmatchedStoreIds: number[] = []

  const platformSubtotal = items.filter(i => i.storeId == null).reduce((s, i) => s + i.price * i.qty, 0)
  if (platformSubtotal > 0 || storeIds.length === 0) {
    cost += platformFallbackShipping(deliveryMethod, platformSubtotal)
  }

  for (const storeId of storeIds) {
    const storeZones = zones.filter(z => z.storeId === storeId)
    const match = storeZones.find(z => z.name.trim().toLowerCase() === normalizedKey)

    if (!match) {
      if (storeZones.length === 0) {
        const storeSubtotal = items.filter(i => i.storeId === storeId).reduce((s, i) => s + i.price * i.qty, 0)
        cost += platformFallbackShipping(deliveryMethod, storeSubtotal)
      } else {
        unmatchedStoreIds.push(storeId)
      }
      continue
    }

    cost += match.price
    if (!match.codAllowed) codAllowed = false
  }

  return { cost, codAllowed, unmatchedStoreIds }
}
