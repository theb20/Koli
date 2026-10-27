/* ─────────────────────────────────────────────────────────────
   Accueil du tableau de bord marchand — toutes les sommes sont faites par
   Postgres (aucune boucle JavaScript sur les commandes). Chaque calcul
   renvoie à sa fiche du dictionnaire (dictionary.ts) entre [crochets].

   Socle commun (CTE « lines ») : les lignes du marchand dans des commandes
   VALIDES — même définition que la Vue d'ensemble de l'admin
   (REVENUE_ORDER de lib/finance/sql.ts), pour qu'un même chiffre ne
   diverge jamais entre les deux tableaux de bord.
───────────────────────────────────────────────────────────── */
import { Prisma, type PrismaClient } from '@prisma/client'
import { prisma } from '../prisma'
import { average, percentChange, ratePct } from '../finance/formulas'
import { PERIOD_DATE, REFUNDED_QTY, REVENUE_ORDER } from '../finance/sql'
import { SELLER_ALERT_THRESHOLDS as T } from './dictionary'
import { daysOf, lastYearPeriod, previousPeriod, sparklineRange, SELLER_TIMEZONE, type Range } from './periods'

type Db = PrismaClient | Prisma.TransactionClient
const n = (v: unknown) => Number(v ?? 0)

/** Jour local (Africa/Abidjan) d'un horodatage stocké en UTC. */
const LOCAL_DAY = (col: Prisma.Sql) => Prisma.sql`to_char((${col} AT TIME ZONE 'UTC') AT TIME ZONE ${SELLER_TIMEZONE}, 'YYYY-MM-DD')`

/**
 * [validOrder][revenueHt][netRevenue] Lignes du marchand dans des commandes
 * valides, avec quantité conservée (remboursements déduits), date de
 * paiement, versement figé et clé client pseudonyme.
 */
const LINES = (storeId: number) => Prisma.sql`
  rq AS (${REFUNDED_QTY}),
  ret AS (
    SELECT ri."orderItemId", SUM(ri.quantity) AS qty
    FROM order_return_items ri JOIN order_returns r ON r.id = ri."returnId"
    WHERE r.status NOT IN ('rejected', 'cancelled')
    GROUP BY ri."orderItemId"
  ),
  lines AS (
    SELECT oi.id, oi."orderId", oi."productId", oi.price, oi.qty,
           GREATEST(oi.qty - COALESCE(rq.qty, 0), 0)        AS kept,
           LEAST(COALESCE(ret.qty, 0), oi.qty)               AS returned,
           fi."supplierPayout"                               AS payout,
           ${PERIOD_DATE}                                    AS paid_at,
           COALESCE(o."userId", 'g:' || lower(o."clientEmail")) AS customer,
           o.status                                          AS status
    FROM order_items oi
    JOIN products p ON p.id = oi."productId" AND p."storeId" = ${storeId}
    JOIN orders o   ON o.id = oi."orderId"
    LEFT JOIN rq    ON rq."orderItemId" = oi.id
    LEFT JOIN ret   ON ret."orderItemId" = oi.id
    LEFT JOIN order_item_financials fi ON fi."orderItemId" = oi.id
    WHERE ${REVENUE_ORDER}
  )`

const IN = (r: Range) => Prisma.sql`paid_at >= ${r.from} AND paid_at < ${r.to}`

/** Agrégats d'une période, en colonnes suffixées (_c courante, _p précédente, _y an dernier). */
function periodColumns(r: Range, s: string) {
  const f = IN(r)
  return Prisma.sql`
    COALESCE(SUM(price * kept) FILTER (WHERE ${f}), 0)                                          AS ${Prisma.raw(`revenue_${s}`)},
    COUNT(DISTINCT "orderId") FILTER (WHERE ${f} AND kept > 0)                                   AS ${Prisma.raw(`orders_${s}`)},
    COALESCE(SUM(ROUND(payout * kept::numeric / NULLIF(qty, 0))) FILTER (WHERE ${f} AND payout IS NOT NULL), 0) AS ${Prisma.raw(`net_${s}`)},
    COALESCE(SUM(price * kept) FILTER (WHERE ${f} AND payout IS NOT NULL), 0)                   AS ${Prisma.raw(`netbase_${s}`)},
    COALESCE(SUM(qty) FILTER (WHERE ${f}), 0)                                                    AS ${Prisma.raw(`units_${s}`)},
    COALESCE(SUM(returned) FILTER (WHERE ${f}), 0)                                               AS ${Prisma.raw(`returned_${s}`)},
    COALESCE(SUM(returned * price) FILTER (WHERE ${f}), 0)                                       AS ${Prisma.raw(`returnedvalue_${s}`)}`
}

type PeriodAgg = { revenue: number; orders: number; net: number; netBase: number; units: number; returned: number; returnedValue: number; newCustomers: number }

async function aggregates(db: Db, storeId: number, ranges: Record<'c' | 'p' | 'y', Range>): Promise<Record<'c' | 'p' | 'y', PeriodAgg>> {
  const [row] = await db.$queryRaw<Record<string, unknown>[]>`
    WITH ${LINES(storeId)},
    firsts AS (SELECT customer, MIN(paid_at) AS first FROM lines WHERE kept > 0 GROUP BY customer)
    SELECT ${periodColumns(ranges.c, 'c')}, ${periodColumns(ranges.p, 'p')}, ${periodColumns(ranges.y, 'y')},
      (SELECT COUNT(*) FROM firsts WHERE first >= ${ranges.c.from} AND first < ${ranges.c.to}) AS new_c,
      (SELECT COUNT(*) FROM firsts WHERE first >= ${ranges.p.from} AND first < ${ranges.p.to}) AS new_p,
      (SELECT COUNT(*) FROM firsts WHERE first >= ${ranges.y.from} AND first < ${ranges.y.to}) AS new_y
    FROM lines`
  const pick = (s: 'c' | 'p' | 'y'): PeriodAgg => ({
    revenue: n(row?.[`revenue_${s}`]), orders: n(row?.[`orders_${s}`]), net: n(row?.[`net_${s}`]),
    netBase: n(row?.[`netbase_${s}`]), units: n(row?.[`units_${s}`]), returned: n(row?.[`returned_${s}`]),
    returnedValue: n(row?.[`returnedvalue_${s}`]), newCustomers: n(row?.[`new_${s}`]),
  })
  return { c: pick('c'), p: pick('p'), y: pick('y') }
}

/** Valeurs jour par jour (mini-courbes) — jours sans vente à 0. */
async function daily(db: Db, storeId: number, r: Range) {
  const rows = await db.$queryRaw<Record<string, unknown>[]>`
    WITH ${LINES(storeId)},
    firsts AS (SELECT customer, MIN(paid_at) AS first FROM lines WHERE kept > 0 GROUP BY customer),
    d AS (
      SELECT ${LOCAL_DAY(Prisma.sql`paid_at`)} AS day,
             SUM(price * kept) AS revenue,
             COUNT(DISTINCT "orderId") FILTER (WHERE kept > 0) AS orders,
             COALESCE(SUM(ROUND(payout * kept::numeric / NULLIF(qty, 0))) FILTER (WHERE payout IS NOT NULL), 0) AS net,
             SUM(qty) AS units, SUM(returned) AS returned
      FROM lines WHERE ${IN(r)} GROUP BY 1
    ),
    nc AS (
      SELECT ${LOCAL_DAY(Prisma.sql`first`)} AS day, COUNT(*) AS new_customers
      FROM firsts WHERE first >= ${r.from} AND first < ${r.to} GROUP BY 1
    )
    SELECT COALESCE(d.day, nc.day) AS day, d.revenue, d.orders, d.net, d.units, d.returned, nc.new_customers
    FROM d FULL OUTER JOIN nc ON nc.day = d.day`
  const byDay = new Map(rows.map(x => [String(x.day), x]))
  return daysOf(r).map(dayKey => {
    const x = byDay.get(dayKey)
    const revenue = n(x?.revenue), orders = n(x?.orders), units = n(x?.units)
    return {
      day: dayKey,
      revenue, orders, net: n(x?.net),
      avgBasket: average(revenue, orders),
      newCustomers: n(x?.new_customers),
      returnRate: units ? (ratePct(n(x?.returned), units) ?? 0) : 0,
    }
  })
}

/** [stockAtRisk] + alertes de qualité de données et de préparation. */
async function stockAndOps(db: Db, storeId: number, now: Date) {
  const since = new Date(now.getTime() - T.salesWindowDays * 86_400_000)
  const unshippedBefore = new Date(now.getTime() - T.unshippedHours * 3_600_000)
  const [row] = await db.$queryRaw<Record<string, unknown>[]>`
    WITH ${LINES(storeId)},
    sales AS (SELECT "productId", SUM(kept) AS units FROM lines WHERE paid_at >= ${since} GROUP BY 1),
    cov AS (
      SELECT p.id, p.name, p.stock,
             CASE WHEN COALESCE(s.units, 0) > 0 THEN p.stock / (s.units::numeric / ${T.salesWindowDays}) END AS days
      FROM products p LEFT JOIN sales s ON s."productId" = p.id
      WHERE p."storeId" = ${storeId} AND p."isActive"
    ),
    late AS (
      SELECT "orderId", MIN(paid_at) AS paid_at FROM lines
      WHERE status IN ('confirmed', 'processing') AND kept > 0 AND paid_at < ${unshippedBefore}
      GROUP BY "orderId"
    )
    SELECT
      (SELECT COUNT(*) FROM cov WHERE stock <= 0)                                    AS out_of_stock,
      (SELECT COUNT(*) FROM cov WHERE stock > 0 AND days < ${T.stockCoverageDays})    AS at_risk,
      (SELECT COUNT(*) FROM cov WHERE stock < 0)                                     AS negative_stock,
      (SELECT COALESCE(json_agg(t ORDER BY t.days), '[]'::json) FROM (
         SELECT id, name, stock, ROUND(days, 1) AS days FROM cov
         WHERE stock > 0 AND days < ${T.stockCoverageDays} ORDER BY days LIMIT 5) t)   AS at_risk_list,
      (SELECT COUNT(*) FROM late)                                                    AS late_orders,
      (SELECT MIN(paid_at) FROM late)                                                AS oldest_late`
  return {
    outOfStock: n(row?.out_of_stock),
    atRisk: n(row?.at_risk),
    negativeStock: n(row?.negative_stock),
    atRiskList: (row?.at_risk_list ?? []) as { id: number; name: string; stock: number; days: number }[],
    lateOrders: n(row?.late_orders),
    oldestLate: (row?.oldest_late as Date | null) ?? null,
  }
}

/* ── Assemblage ─────────────────────────────────────────────── */

type Kpi = {
  current: number
  previous: number
  lastYear: number
  /** Écart vs période précédente : absolu (même unité ; points pour un taux) et relatif (%) */
  vsPrevious: { abs: number; pct: number | null }
  vsLastYear: { abs: number; pct: number | null }
  sparkline: number[] | null
}

function kpi(c: number, p: number, y: number, spark: number[] | null, isRate = false): Kpi {
  const round = (v: number) => (isRate ? Math.round(v * 10) / 10 : v)
  return {
    current: c, previous: p, lastYear: y,
    vsPrevious: { abs: round(c - p), pct: isRate ? null : percentChange(c, p) },
    vsLastYear: { abs: round(c - y), pct: isRate ? null : percentChange(c, y) },
    sparkline: spark,
  }
}

const returnRateOf = (a: PeriodAgg) => (a.units ? (ratePct(a.returned, a.units) ?? 0) : 0)

export type SellerOverview = Awaited<ReturnType<typeof sellerOverview>>

export async function sellerOverview(storeId: number, range: Range, now = new Date(), db: Db = prisma) {
  const ranges = { c: range, p: previousPeriod(range), y: lastYearPeriod(range) }
  const [agg, days, ops] = await Promise.all([
    aggregates(db, storeId, ranges),
    daily(db, storeId, sparklineRange(range)),
    stockAndOps(db, storeId, now),
  ])
  const { c, p, y } = agg
  const col = <K extends keyof (typeof days)[number]>(k: K) => days.map(d => d[k] as number)

  const alerts: { id: string; severity: 'critical' | 'warning' | 'info'; title: string; detail: string; link: string }[] = []
  if (ops.negativeStock > 0) alerts.push({ id: 'negative-stock', severity: 'critical', title: `${ops.negativeStock} produit(s) avec un stock négatif`, detail: 'Anomalie de données : corrigez le stock de ces produits.', link: '/produits' })
  if (ops.lateOrders > 0) alerts.push({ id: 'late-orders', severity: 'critical', title: `${ops.lateOrders} commande(s) payée(s) non expédiée(s) depuis plus de ${T.unshippedHours} h`, detail: 'Le client attend : passez-les en préparation puis expédiées.', link: '/commandes' })
  if (ops.outOfStock > 0) alerts.push({ id: 'out-of-stock', severity: 'critical', title: `${ops.outOfStock} produit(s) en rupture`, detail: 'Ils ne peuvent plus être commandés.', link: '/produits' })
  if (ops.atRisk > 0) alerts.push({ id: 'stock-at-risk', severity: 'warning', title: `${ops.atRisk} produit(s) bientôt en rupture`, detail: `Moins de ${T.stockCoverageDays} jours de stock au rythme actuel${ops.atRiskList[0] ? `, dont « ${ops.atRiskList[0].name} » (${ops.atRiskList[0].days} j)` : ''}.`, link: '/produits' })
  const rr = returnRateOf(c)
  if (c.units >= 10 && rr > T.returnRatePct) alerts.push({ id: 'return-rate', severity: 'warning', title: `Taux de retour élevé : ${rr.toLocaleString('fr-FR')} %`, detail: `Au-dessus de ${T.returnRatePct} % sur la période.`, link: '/commandes' })

  return {
    period: { from: range.from.toISOString(), to: range.to.toISOString(), timezone: SELLER_TIMEZONE },
    kpis: {
      revenueHt:    kpi(c.revenue, p.revenue, y.revenue, col('revenue')),
      validOrders:  kpi(c.orders, p.orders, y.orders, col('orders')),
      avgBasket:    kpi(average(c.revenue, c.orders), average(p.revenue, p.orders), average(y.revenue, y.orders), col('avgBasket')),
      newCustomers: kpi(c.newCustomers, p.newCustomers, y.newCustomers, col('newCustomers')),
      netRevenue: {
        ...kpi(c.net, p.net, y.net, col('net')),
        /** Part du CA dont la commission est connue (le net n'est calculé que sur elle). */
        coveragePct: c.revenue ? (ratePct(c.netBase, c.revenue) ?? 0) : null,
      },
      returnRate: { ...kpi(rr, returnRateOf(p), returnRateOf(y), col('returnRate'), true), returnedUnits: c.returned, returnedValue: c.returnedValue },
      stockAtRisk: { current: ops.atRisk + ops.outOfStock, atRisk: ops.atRisk, outOfStock: ops.outOfStock, products: ops.atRiskList },
    },
    alerts: alerts.sort((a, b) => ['critical', 'warning', 'info'].indexOf(a.severity) - ['critical', 'warning', 'info'].indexOf(b.severity)),
  }
}
