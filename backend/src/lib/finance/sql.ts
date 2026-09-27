/* ─────────────────────────────────────────────────────────────
   Fragments SQL des agrégations financières — chacun est le miroir exact
   d'une fonction de formulas.ts (nommée en commentaire) : toute évolution
   d'une formule se fait aux deux endroits, et les tests (formulas.test.ts
   + overview.db.test.ts) vérifient qu'ils concordent.
   Alias attendus : o = orders, f = order_financials, fi =
   order_item_financials, rf = REFUNDED_TTC, rq = REFUNDED_QTY.
───────────────────────────────────────────────────────────── */
import { Prisma } from '@prisma/client'

/** isRevenueOrder() — payée, ni annulée ni remboursée, pas à la corbeille. */
export const REVENUE_ORDER = Prisma.sql`o."paymentStatus" = 'paid' AND o.status NOT IN ('cancelled', 'refunded') AND o."deletedAt" IS NULL`

/** Date de référence des périodes : le paiement (création pour les rares commandes sans paidAt). */
export const PERIOD_DATE = Prisma.sql`COALESCE(o."paidAt", o."createdAt")`

/** Montant TTC remboursé par commande (retours "refunded"). */
export const REFUNDED_TTC = Prisma.sql`
  SELECT r."orderId", SUM(COALESCE(r."refundAmount", 0)) AS amount
  FROM order_returns r WHERE r.status = 'refunded' GROUP BY r."orderId"`

/** Quantité remboursée par ligne (retours "refunded"). */
export const REFUNDED_QTY = Prisma.sql`
  SELECT ri."orderItemId", SUM(ri.quantity) AS qty
  FROM order_return_items ri JOIN order_returns r ON r.id = ri."returnId"
  WHERE r.status = 'refunded' GROUP BY ri."orderItemId"`

const REFUND = Prisma.sql`COALESCE(rf.amount, 0)`
/** splitTtc(remboursé).ht */
const REFUND_HT = Prisma.sql`ROUND(${REFUND} * 100 / (100 + o."taxRate"::numeric))`

/** orderVolume().ttc */
export const ORDER_TTC = Prisma.sql`(o.total - ${REFUND})`
/** orderVolume().ht */
export const ORDER_HT = Prisma.sql`(o.subtotal + o."assistanceTotal" - o."promoDiscount" - ${REFUND_HT})`
/** orderVolume().vat */
export const ORDER_VAT = Prisma.sql`(o."taxAmount" - (${REFUND} - ${REFUND_HT}))`

/** keptRatio(quantity, refundedQty) */
export const KEPT_RATIO = Prisma.sql`(GREATEST(fi.quantity - COALESCE(rq.qty, 0), 0)::numeric / NULLIF(fi.quantity, 0))`

/** effectiveLine() — chaque montant de ligne au prorata conservé, arrondi à la ligne. */
export const LINE = {
  revenueHt:  Prisma.sql`(ROUND((fi."unitSellingPriceHt" * fi.quantity - fi."discountAmount") * ${KEPT_RATIO}) + fi."assistanceHt")`,
  commission: Prisma.sql`ROUND(fi."commissionAmount" * ${KEPT_RATIO})`,
  payout:     Prisma.sql`ROUND(fi."supplierPayout" * ${KEPT_RATIO})`,
  margin:     Prisma.sql`ROUND(fi.margin * ${KEPT_RATIO})`,
  services:   Prisma.sql`fi."assistanceHt"`,
}

/** Commande prise en compte dans les calculs de marge : figée ET coût connu. */
export const MARGIN_ELIGIBLE = Prisma.sql`(f."snapshotAt" IS NOT NULL AND f."costKnown")`
