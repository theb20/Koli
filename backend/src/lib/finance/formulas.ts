/* ─────────────────────────────────────────────────────────────
   Formules financières — SOURCE UNIQUE. Aucune formule de marge, TVA ou
   commission ne doit être réécrite ailleurs (routes, koli-admin) : le
   figement des commandes (snapshot.ts), les agrégations SQL (sql.ts, dont
   chaque fragment reprend une fonction d'ici, nommée en commentaire) et
   l'API admin passent tous par ce module.

   Conventions :
   - Montants en F CFA entiers, arrondis au plus proche (jamais de float
     stocké). Taux (TVA, commission) en pourcentage : 18 = 18 %.
   - Prix catalogue (Product.price / OrderItem.price) = prix de vente HT :
     la TVA (TaxRate par défaut, voir vat.ts) s'ajoute au panier. Taux 0 ou
     aucun taux actif = TVA désactivée, HT = TTC.
   - Marge = vente HT − coût HT, jamais calculée sur le TTC.
───────────────────────────────────────────────────────────── */

export const SUPPLIER_MODES = ['MARGIN', 'COMMISSION'] as const
export type SupplierMode = typeof SUPPLIER_MODES[number]
export const DEFAULT_SUPPLIER_MODE: SupplierMode = 'MARGIN'

/** Arrondi au F CFA le plus proche, 0,5 loin de zéro — comme ROUND() de Postgres sur numeric. */
export function roundXof(n: number): number {
  const r = Math.sign(n) * Math.round(Math.abs(n))
  return r === 0 ? 0 : r // pas de -0
}

/** Calcul en centièmes entiers pour éviter les erreurs de float (18000 × 1,18). */
const factor100 = (ratePct: number) => 100 + ratePct

/** 21 240 TTC à 18 % → 18 000 HT */
export function htFromTtc(ttc: number, vatRatePct: number): number {
  return roundXof((ttc * 100) / factor100(vatRatePct))
}

/** 18 000 HT à 18 % → 21 240 TTC */
export function ttcFromHt(ht: number, vatRatePct: number): number {
  return roundXof((ht * factor100(vatRatePct)) / 100)
}

/** Sépare un montant TTC (ex. un remboursement) en HT + TVA dont la somme redonne exactement le TTC. */
export function splitTtc(ttc: number, vatRatePct: number): { ht: number; vat: number } {
  const ht = htFromTtc(ttc, vatRatePct)
  return { ht, vat: ttc - ht }
}

/** a / b × 100 arrondi à 1 décimale ; null si b = 0 (pas de taux inventé). */
export function ratePct(a: number, b: number): number | null {
  if (!b) return null
  return Math.round((a / b) * 1000) / 10
}

/** Taux de marge brute = marge HT / CA HT × 100 */
export const marginRate = (margin: number, revenueHt: number) => ratePct(margin, revenueHt)

/** Variation en % (1 décimale) ; null si la période de référence est vide. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

/** Moyenne arrondie au F CFA ; 0 si aucun élément. */
export const average = (total: number, count: number) => (count ? roundXof(total / count) : 0)

/**
 * Répartit `total` au prorata de `weights` en entiers dont la somme vaut
 * EXACTEMENT `total` (méthode du plus fort reste) — pour ventiler la TVA ou
 * une remise de commande sur les lignes sans perdre ni créer 1 F CFA.
 */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0)
  if (weights.length === 0) return []
  if (sum <= 0) return weights.map((_, i) => (i === 0 ? total : 0))
  const raw = weights.map(w => (total * w) / sum)
  const floors = raw.map(Math.floor)
  let rest = total - floors.reduce((s, f) => s + f, 0)
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (const { i } of order) {
    if (rest <= 0) break
    floors[i]! += 1
    rest -= 1
  }
  return floors
}

/* ── Produit (valeurs dérivées, jamais stockées) ──────────────── */

export type ProductPricing = {
  sellingPriceHt: number
  /** Prix public TTC au taux de TVA actuel */
  sellingPrice: number
  vat: number
  supplierPrice: number | null
  margin: number | null
  marginRate: number | null
}

/**
 * Marge d'un produit du catalogue au prix et au taux de TVA ACTUELS —
 * pour l'affichage admin uniquement. Les statistiques utilisent toujours
 * les valeurs figées des commandes (OrderItemFinancials), jamais ceci.
 */
export function productPricing(input: { priceHt: number; supplierPrice: number | null; vatRatePct: number }): ProductPricing {
  const sellingPrice = ttcFromHt(input.priceHt, input.vatRatePct)
  const margin = input.supplierPrice == null ? null : input.priceHt - input.supplierPrice
  return {
    sellingPriceHt: input.priceHt,
    sellingPrice,
    vat: sellingPrice - input.priceHt,
    supplierPrice: input.supplierPrice,
    margin,
    marginRate: margin == null ? null : marginRate(margin, input.priceHt),
  }
}

/* ── Ligne de commande (figée au paiement) ────────────────────── */

export type LineInput = {
  unitPriceHt: number
  quantity: number
  mode: SupplierMode
  /** Prix d'achat HT unitaire (MARGIN) — null si inconnu */
  unitSupplierPrice: number | null
  /** % (COMMISSION) — null si inconnu */
  commissionRate: number | null
  /** Option « Assistance technique » HT de la ligne (par ligne, pas par unité) */
  assistanceHt?: number
}

export type LineFinancials = {
  unitSellingPriceHt: number
  unitSellingPriceTtc: number
  quantity: number
  discountAmount: number
  vatAmount: number
  assistanceHt: number
  commissionAmount: number
  /** null = coût inconnu */
  supplierPayout: number | null
  /** Marge produit HT (hors assistance) — null = coût inconnu */
  margin: number | null
  costKnown: boolean
}

/**
 * Calcule une ligne. `discountHt` et `vatAmount` sont des quotes-parts déjà
 * ventilées au niveau commande (voir orderLines) ; appelée seule (sans
 * commande), la TVA est simplement celle du HT de la ligne.
 *
 *   net HT      = PU HT × qté − remise
 *   MARGIN      : reversé = prix d'achat × qté,          commission = 0
 *   COMMISSION  : commission = PU HT × qté × taux,       reversé = PU HT × qté − commission
 *   marge       = net HT − reversé
 *
 * La commission porte sur le HT avant remise, comme le crédit marchand de
 * merchantgo (price × qty) : la remise promo est à la charge de la plateforme.
 */
export function lineFinancials(input: LineInput & { vatRatePct: number; discountHt?: number; vatAmount?: number }): LineFinancials {
  const grossHt = input.unitPriceHt * input.quantity
  const discountAmount = input.discountHt ?? 0
  const assistanceHt = input.assistanceHt ?? 0
  const netHt = grossHt - discountAmount
  const vatAmount = input.vatAmount ?? roundXof(((grossHt + assistanceHt) * input.vatRatePct) / 100)

  let commissionAmount = 0
  let supplierPayout: number | null = null
  if (input.mode === 'MARGIN') {
    if (input.unitSupplierPrice != null) supplierPayout = input.unitSupplierPrice * input.quantity
  } else if (input.commissionRate != null) {
    commissionAmount = roundXof((grossHt * input.commissionRate) / 100)
    supplierPayout = grossHt - commissionAmount
  }

  return {
    unitSellingPriceHt: input.unitPriceHt,
    unitSellingPriceTtc: ttcFromHt(input.unitPriceHt, input.vatRatePct),
    quantity: input.quantity,
    discountAmount,
    vatAmount,
    assistanceHt,
    commissionAmount,
    supplierPayout,
    margin: supplierPayout == null ? null : netHt - supplierPayout,
    costKnown: supplierPayout != null,
  }
}

/**
 * Fige toutes les lignes d'une commande : ventile la remise promo (au
 * prorata du HT produits) et la TVA facturée (au prorata du HT produits +
 * assistance) de sorte que les sommes des lignes redonnent exactement
 * Order.promoDiscount et Order.taxAmount — ce qu'affiche la facture.
 */
export function orderLines(order: { taxRate: number; taxAmount: number; promoDiscount: number }, lines: LineInput[]): { lines: LineFinancials[]; costKnown: boolean } {
  const grossHt = lines.map(l => l.unitPriceHt * l.quantity)
  const discounts = allocate(order.promoDiscount, grossHt)
  const vats = allocate(order.taxAmount, lines.map((l, i) => grossHt[i]! + (l.assistanceHt ?? 0)))
  const out = lines.map((l, i) => lineFinancials({ ...l, vatRatePct: order.taxRate, discountHt: discounts[i], vatAmount: vats[i] }))
  return { lines: out, costKnown: out.length > 0 && out.every(l => l.costKnown) }
}

/* ── Remboursements ───────────────────────────────────────────── */

/**
 * Part conservée d'une ligne après remboursement partiel (retours au statut
 * "refunded") : (qté − qté remboursée) / qté. Une commande entièrement
 * remboursée (status "refunded") est exclue en amont (isRevenueOrder).
 * Miroir SQL : KEPT_RATIO dans sql.ts.
 */
export function keptRatio(quantity: number, refundedQty: number): number {
  if (quantity <= 0) return 0
  return Math.max(quantity - refundedQty, 0) / quantity
}

/**
 * Valeurs d'une ligne figée après remboursement : vente, commission, reversé
 * et marge au prorata des quantités conservées. L'assistance technique n'est
 * pas remboursable (CGV) et reste acquise.
 */
export function effectiveLine(line: LineFinancials, refundedQty: number) {
  const k = keptRatio(line.quantity, refundedQty)
  const netHt = line.unitSellingPriceHt * line.quantity - line.discountAmount
  return {
    revenueHt: roundXof(netHt * k) + line.assistanceHt,
    commissionAmount: roundXof(line.commissionAmount * k),
    supplierPayout: line.supplierPayout == null ? null : roundXof(line.supplierPayout * k),
    margin: line.margin == null ? null : roundXof(line.margin * k),
    services: line.assistanceHt,
  }
}

/* ── Commande ─────────────────────────────────────────────────── */

/**
 * Une commande compte dans le CA si elle est payée, ni annulée ni
 * remboursée, et pas à la corbeille. Miroir SQL : REVENUE_ORDER.
 */
export function isRevenueOrder(o: { paymentStatus: string; status: string; deletedAt: Date | null }): boolean {
  return o.paymentStatus === 'paid' && o.status !== 'cancelled' && o.status !== 'refunded' && o.deletedAt == null
}

/**
 * Volume d'une commande après remboursements partiels (montants TTC des
 * retours "refunded") :
 *   TTC = total − remboursé            (livraison incluse)
 *   HT  = produits − remise + assistance − part HT du remboursé   (hors livraison)
 *   TVA = TVA facturée − part TVA du remboursé
 * Miroir SQL : ORDER_TTC / ORDER_HT / ORDER_VAT.
 */
export function orderVolume(o: { total: number; subtotal: number; assistanceTotal: number; promoDiscount: number; taxRate: number; taxAmount: number }, refundedTtc = 0) {
  const refund = splitTtc(refundedTtc, o.taxRate)
  return {
    ttc: o.total - refundedTtc,
    ht: o.subtotal + o.assistanceTotal - o.promoDiscount - refund.ht,
    vat: o.taxAmount - refund.vat,
  }
}

/** Marge brute figée d'une commande (produits + assistance) ; null si un coût est inconnu. */
export function orderGrossMargin(lines: { margin: number | null; assistanceHt: number }[]): number | null {
  if (lines.length === 0 || lines.some(l => l.margin == null)) return null
  return lines.reduce((s, l) => s + l.margin! + l.assistanceHt, 0)
}

/** Résultat livraison = frais facturés − coût réel ; null si le coût réel est inconnu. */
export function shippingResult(charged: number, actualCost: number | null): number | null {
  return actualCost == null ? null : charged - actualCost
}
