/* ─────────────────────────────────────────────────────────────
   Taux de TVA — point de configuration UNIQUE : le taux par défaut actif
   de la table TaxRate (admin → TVA & Taxes ; 18 % pour la Côte d'Ivoire).
   Désactiver la TVA = désactiver ce taux (ou n'en définir aucun) → 0 %.
   Utilisé par la création de commande, les devis de sourcing et la marge
   produit affichée dans l'admin. Une commande fige son propre taux
   (Order.taxRate) : changer le taux n'affecte jamais le passé.
───────────────────────────────────────────────────────────── */
import { prisma } from '../prisma'

export async function getVatRatePercent(): Promise<number> {
  const tax = await prisma.taxRate.findFirst({ where: { isDefault: true, isActive: true }, select: { rate: true } })
  return tax?.rate ?? 0
}
