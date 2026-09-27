/* ─────────────────────────────────────────────────────────────
   Indicateurs financiers de la Vue d'ensemble — toutes les sommes sont
   faites par Postgres (GROUP BY / FILTER), jamais en rapatriant les
   commandes. Les montants viennent des valeurs FIGÉES au paiement
   (OrderItemFinancials), jamais des prix actuels des produits.
   Fuseau Africa/Abidjan = UTC : les bornes de période sont en UTC.
───────────────────────────────────────────────────────────── */
import { Prisma, type PrismaClient } from '@prisma/client'
import { prisma } from '../prisma'
import { average, marginRate, percentChange, ratePct } from './formulas'
import { LINE, MARGIN_ELIGIBLE, ORDER_HT, ORDER_TTC, ORDER_VAT, PERIOD_DATE, REFUNDED_QTY, REFUNDED_TTC, REVENUE_ORDER } from './sql'

type Db = PrismaClient | Prisma.TransactionClient

export const PERIOD_PRESETS = ['month', 'quarter', 'year', 'custom'] as const
export type PeriodPreset = typeof PERIOD_PRESETS[number]

const DAY = 86_400_000
const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

/**
 * Bornes [from, to[ d'une période. month/quarter/year = période civile EN
 * COURS jusqu'à aujourd'hui inclus ; custom = dates AAAA-MM-JJ incluses.
 */
export function periodRange(preset: PeriodPreset, custom?: { from: string; to: string }, now = new Date()): { from: Date; to: Date } {
  const tomorrow = new Date(utcDay(now).getTime() + DAY)
  const y = now.getUTCFullYear(), m = now.getUTCMonth()
  switch (preset) {
    case 'month':   return { from: new Date(Date.UTC(y, m, 1)), to: tomorrow }
    case 'quarter': return { from: new Date(Date.UTC(y, m - (m % 3), 1)), to: tomorrow }
    case 'year':    return { from: new Date(Date.UTC(y, 0, 1)), to: tomorrow }
    case 'custom': {
      if (!custom) throw new Error('Période personnalisée sans dates')
      return { from: new Date(`${custom.from}T00:00:00Z`), to: new Date(new Date(`${custom.to}T00:00:00Z`).getTime() + DAY) }
    }
  }
}

const inPeriod = (r?: { from: Date; to: Date }) =>
  r ? Prisma.sql`AND ${PERIOD_DATE} >= ${r.from} AND ${PERIOD_DATE} < ${r.to}` : Prisma.empty

const n = (v: unknown) => Number(v ?? 0)

/** CA TTC (livraison incluse, remboursements déduits) sur une période, ou depuis toujours. */
async function revenueTtc(db: Db, r?: { from: Date; to: Date }): Promise<number> {
  const [row] = await db.$queryRaw<{ ttc: unknown }[]>`
    WITH rf AS (${REFUNDED_TTC})
    SELECT COALESCE(SUM(${ORDER_TTC}), 0) AS ttc
    FROM orders o LEFT JOIN rf ON rf."orderId" = o.id
    WHERE ${REVENUE_ORDER} ${inPeriod(r)}`
  return n(row?.ttc)
}

/** Volume + TVA + livraison + couverture de la période (niveau commande). */
async function periodVolume(db: Db, r: { from: Date; to: Date }) {
  const [row] = await db.$queryRaw<Record<string, unknown>[]>`
    WITH rf AS (${REFUNDED_TTC})
    SELECT
      COUNT(*)                                                                    AS orders,
      COALESCE(SUM(${ORDER_TTC}), 0)                                              AS ttc,
      COALESCE(SUM(${ORDER_HT}), 0)                                               AS ht,
      COALESCE(SUM(${ORDER_VAT}), 0)                                              AS vat,
      COUNT(*) FILTER (WHERE NOT COALESCE(${MARGIN_ELIGIBLE}, false))             AS excluded,
      COALESCE(SUM(o."shippingCost"), 0)                                          AS shipping_charged,
      COALESCE(SUM(f."shippingActualCost"), 0)                                    AS shipping_cost,
      COALESCE(SUM(o."shippingCost" - f."shippingActualCost"), 0)                 AS shipping_result,
      COUNT(*) FILTER (WHERE f."shippingActualCost" IS NULL)                      AS shipping_unknown
    FROM orders o
    LEFT JOIN rf ON rf."orderId" = o.id
    LEFT JOIN order_financials f ON f."orderId" = o.id
    WHERE ${REVENUE_ORDER} ${inPeriod(r)}`
  return {
    orders: n(row?.orders), ttc: n(row?.ttc), ht: n(row?.ht), vat: n(row?.vat), excluded: n(row?.excluded),
    shippingCharged: n(row?.shipping_charged), shippingCost: n(row?.shipping_cost),
    shippingResult: n(row?.shipping_result), shippingUnknown: n(row?.shipping_unknown),
  }
}

/** Jointures communes des agrégats de lignes (commandes éligibles aux marges). */
const LINES_FROM = (r: { from: Date; to: Date }, joins: Prisma.Sql = Prisma.empty) => Prisma.sql`
  FROM order_item_financials fi
  JOIN orders o ON o.id = fi."orderId"
  JOIN order_financials f ON f."orderId" = o.id
  LEFT JOIN rq ON rq."orderItemId" = fi."orderItemId"
  ${joins}
  WHERE ${REVENUE_ORDER} AND ${MARGIN_ELIGIBLE} ${inPeriod(r)}`

async function periodMargins(db: Db, r: { from: Date; to: Date }) {
  const [row] = await db.$queryRaw<Record<string, unknown>[]>`
    WITH rq AS (${REFUNDED_QTY})
    SELECT
      COUNT(DISTINCT o.id)                                                          AS orders,
      COALESCE(SUM(${LINE.revenueHt}), 0)                                           AS revenue_ht,
      COALESCE(SUM(${LINE.payout}) FILTER (WHERE fi."supplierMode" = 'MARGIN'), 0)  AS cogs,
      COALESCE(SUM(${LINE.payout}), 0)                                              AS payout,
      COALESCE(SUM(${LINE.commission}) FILTER (WHERE fi."supplierMode" = 'COMMISSION'), 0) AS commissions,
      COALESCE(SUM(${LINE.margin}), 0)                                              AS product_margin,
      COALESCE(SUM(${LINE.services}), 0)                                            AS services
    ${LINES_FROM(r)}`
  return {
    orders: n(row?.orders), revenueHt: n(row?.revenue_ht), cogs: n(row?.cogs), payout: n(row?.payout),
    commissions: n(row?.commissions), productMargin: n(row?.product_margin), services: n(row?.services),
  }
}

async function topProducts(db: Db, r: { from: Date; to: Date }) {
  const rows = await db.$queryRaw<Record<string, unknown>[]>`
    WITH rq AS (${REFUNDED_QTY})
    SELECT oi."productId" AS id, MAX(oi.name) AS name, MAX(oi.image) AS image,
           SUM(GREATEST(fi.quantity - COALESCE(rq.qty, 0), 0)) AS qty,
           SUM(${LINE.margin}) AS margin,
           SUM(${LINE.revenueHt} - ${LINE.services}) AS revenue_ht
    ${LINES_FROM(r, Prisma.sql`JOIN order_items oi ON oi.id = fi."orderItemId"`)}
    GROUP BY oi."productId" HAVING SUM(${LINE.margin}) IS NOT NULL
    ORDER BY margin DESC LIMIT 5`
  return rows.map(p => ({
    id: n(p.id), name: String(p.name), image: (p.image as string) || null, qty: n(p.qty),
    margin: n(p.margin), marginRate: marginRate(n(p.margin), n(p.revenue_ht)),
  }))
}

async function topSuppliers(db: Db, r: { from: Date; to: Date }) {
  const rows = await db.$queryRaw<Record<string, unknown>[]>`
    WITH rq AS (${REFUNDED_QTY})
    SELECT CASE WHEN fi."supplierId" IS NOT NULL THEN 'supplier'
                WHEN fi."sellerStoreId" IS NOT NULL THEN 'merchant' ELSE 'none' END AS kind,
           COALESCE(fi."supplierId", fi."sellerStoreId") AS id,
           MAX(COALESCE(s.name, ss.name)) AS name,
           COUNT(DISTINCT o.id) AS orders,
           SUM(${LINE.margin}) AS margin
    ${LINES_FROM(r, Prisma.sql`LEFT JOIN suppliers s ON s.id = fi."supplierId" LEFT JOIN seller_stores ss ON ss.id = fi."sellerStoreId"`)}
    GROUP BY 1, 2
    ORDER BY margin DESC LIMIT 5`
  return rows.map(s => ({
    kind: s.kind as 'supplier' | 'merchant' | 'none',
    id: s.id == null ? null : n(s.id),
    name: (s.name as string | null) ?? null,
    orders: n(s.orders),
    margin: n(s.margin),
  }))
}

export type FinanceOverview = Awaited<ReturnType<typeof financeOverview>>

export async function financeOverview(range: { from: Date; to: Date }, now = new Date(), db: Db = prisma) {
  // Mois en cours vs même nombre de jours du mois précédent (comparaison équitable)
  const tomorrow = new Date(utcDay(now).getTime() + DAY)
  const monthFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const prevFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const prevTo = new Date(Math.min(prevFrom.getTime() + (tomorrow.getTime() - monthFrom.getTime()), monthFrom.getTime()))
  const yearFrom = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))

  const [allTime, year, month, prevMonth, vol, mar, products, suppliers] = await Promise.all([
    revenueTtc(db),
    revenueTtc(db, { from: yearFrom, to: tomorrow }),
    revenueTtc(db, { from: monthFrom, to: tomorrow }),
    revenueTtc(db, { from: prevFrom, to: prevTo }),
    periodVolume(db, range),
    periodMargins(db, range),
    topProducts(db, range),
    topSuppliers(db, range),
  ])

  const grossMargin = mar.productMargin + mar.services
  return {
    range: { from: range.from.toISOString().slice(0, 10), to: new Date(range.to.getTime() - DAY).toISOString().slice(0, 10) },
    volume: {
      revenueTtcAllTime: allTime,
      revenueTtcYear: year,
      revenueTtcMonth: month,
      revenueTtcPrevMonthSamePeriod: prevMonth,
      monthChangePct: percentChange(month, prevMonth),
      revenueTtc: vol.ttc,
      revenueHt: vol.ht,
      orders: vol.orders,
      avgBasketTtc: average(vol.ttc, vol.orders),
    },
    costs: {
      cogs: mar.cogs,
      supplierPayout: mar.payout,
      vatCollected: vol.vat,
      shippingCost: vol.shippingCost,
    },
    profit: {
      grossMargin,
      productMargin: mar.productMargin,
      services: mar.services,
      marginRatePct: marginRate(grossMargin, mar.revenueHt),
      commissions: mar.commissions,
      shippingResult: vol.shippingResult,
      avgMarginPerOrder: average(grossMargin, mar.orders),
      topProducts: products,
      topSuppliers: suppliers,
    },
    coverage: {
      marginOrders: mar.orders,
      marginRevenueHt: mar.revenueHt,
      excludedOrders: vol.excluded,
      excludedSharePct: ratePct(vol.excluded, vol.orders),
      shippingUnknownOrders: vol.shippingUnknown,
    },
  }
}
