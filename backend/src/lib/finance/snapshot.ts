/* ─────────────────────────────────────────────────────────────
   Figement financier d'une commande au paiement confirmé — appelé partout
   où une commande passe paymentStatus = "paid" (internal.ts mark-paid,
   applyOrderStatusChange, IPN PayDunya historique). Copie dans
   OrderItemFinancials le prix d'achat, le mode et le taux de commission du
   fournisseur À CET INSTANT, puis ne les recalcule plus jamais.

   Qui est le « fournisseur » d'une ligne :
   - produit de boutique marchande (Product.storeId) → mode COMMISSION, taux
     lu dans merchantgo (celui qu'il applique au crédit du portefeuille) ;
   - sinon le Supplier de ProductSourcing (mode MARGIN par défaut) ;
   - sinon MARGIN sans fournisseur, avec le prix d'achat s'il est connu.
   Tout coût manquant (prix d'achat non renseigné, merchantgo injoignable)
   → costKnown = false : commande exclue des marges, jamais de coût inventé.
───────────────────────────────────────────────────────────── */
import { prisma } from '../prisma'
import { logger } from '../logger'
import { getMerchantBillingBulk, isMerchantgoConfigured } from '../merchantgo'
import { orderLines, DEFAULT_SUPPLIER_MODE, SUPPLIER_MODES, type LineInput, type SupplierMode } from './formulas'

type MerchantgoBilling = {
  mode: 'commission' | 'subscription'
  commission_rate: number
  subscription_plan?: { commission_rate: number } | null
}

/**
 * Taux réellement appliqué par merchantgo (wallet_service.RecordSale) : en
 * abonnement, celui du plan (0 sans plan) ; sinon le taux du marchand.
 * null = inconnu (merchantgo non configuré ou injoignable).
 */
async function merchantCommissionRates(userIds: string[]): Promise<Map<string, number | null>> {
  const rates = new Map<string, number | null>(userIds.map(id => [id, null]))
  if (userIds.length === 0 || !isMerchantgoConfigured()) return rates
  try {
    const res = await getMerchantBillingBulk(userIds) as { data?: Record<string, MerchantgoBilling> }
    for (const [userId, b] of Object.entries(res.data ?? {})) {
      rates.set(userId, b.mode === 'subscription' ? (b.subscription_plan?.commission_rate ?? 0) : b.commission_rate)
    }
  } catch (err) {
    logger.error('[finance/snapshot] taux de commission merchantgo indisponibles', err)
  }
  return rates
}

const asMode = (m: string | null | undefined): SupplierMode =>
  (SUPPLIER_MODES as readonly string[]).includes(m ?? '') ? m as SupplierMode : DEFAULT_SUPPLIER_MODE

/** Idempotent : ne fait rien si la commande n'est pas payée ou déjà figée. */
export async function snapshotOrderFinancials(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true, paymentStatus: true, taxRate: true, taxAmount: true, promoDiscount: true,
      financials: { select: { snapshotAt: true } },
      items: {
        orderBy: { id: 'asc' },
        select: {
          id: true, price: true, qty: true, assistancePrice: true,
          product: {
            select: {
              storeId: true,
              store: { select: { userId: true } },
              sourcing: { select: { supplierPrice: true, supplier: { select: { id: true, mode: true, commissionRate: true } } } },
            },
          },
        },
      },
    },
  })
  if (!order || order.paymentStatus !== 'paid' || order.financials?.snapshotAt) return

  const merchantUserIds = [...new Set(order.items.map(i => i.product.store?.userId).filter((id): id is string => !!id))]
  const merchantRates = await merchantCommissionRates(merchantUserIds)

  type SourcedLine = LineInput & { supplierId: number | null; sellerStoreId: number | null }
  const inputs = order.items.map((item): SourcedLine => {
    const { store, storeId, sourcing } = item.product
    const supplier = sourcing?.supplier ?? null
    const base = { unitPriceHt: item.price, quantity: item.qty, assistanceHt: item.assistancePrice }
    if (storeId != null && store) {
      return { ...base, mode: 'COMMISSION', unitSupplierPrice: null, commissionRate: merchantRates.get(store.userId) ?? null, supplierId: null, sellerStoreId: storeId }
    }
    return {
      ...base,
      mode: asMode(supplier?.mode),
      unitSupplierPrice: sourcing?.supplierPrice ?? null,
      commissionRate: supplier?.commissionRate ?? null,
      supplierId: supplier?.id ?? null,
      sellerStoreId: null,
    }
  })

  const { lines, costKnown } = orderLines(order, inputs)
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    const current = await tx.orderFinancials.findUnique({ where: { orderId }, select: { snapshotAt: true } })
    if (current?.snapshotAt) return
    // Clé primaire = orderItemId : deux figements concurrents ne peuvent
    // jamais écrire deux fois la même ligne (le second échoue et s'annule).
    await tx.orderItemFinancials.createMany({
      data: lines.map((l, i) => {
        const input = inputs[i]!
        return {
          orderItemId:         order.items[i]!.id,
          orderId,
          supplierId:          input.supplierId,
          sellerStoreId:       input.sellerStoreId,
          supplierMode:        input.mode,
          commissionRate:      input.mode === 'COMMISSION' ? input.commissionRate : null,
          unitSupplierPrice:   input.mode === 'MARGIN' ? input.unitSupplierPrice : null,
          unitSellingPriceHt:  l.unitSellingPriceHt,
          unitSellingPriceTtc: l.unitSellingPriceTtc,
          quantity:            l.quantity,
          discountAmount:      l.discountAmount,
          vatAmount:           l.vatAmount,
          assistanceHt:        l.assistanceHt,
          commissionAmount:    l.commissionAmount,
          supplierPayout:      l.supplierPayout,
          margin:              l.margin,
        }
      }),
    })
    await tx.orderFinancials.upsert({
      where:  { orderId },
      create: { orderId, costKnown, snapshotAt: now },
      update: { costKnown, snapshotAt: now },
    })
  })
}

/** Non bloquant — la transition de paiement ne doit jamais échouer à cause du figement. */
export function snapshotOrderFinancialsSafe(orderId: string): void {
  snapshotOrderFinancials(orderId).catch(err => logger.error('[finance/snapshot] échec figement', orderId, err))
}

/**
 * Rattrapage des commandes payées dont le figement a échoué (erreur
 * transitoire) — appelé avant chaque calcul du tableau de bord. Les
 * commandes antérieures au suivi ont une ligne OrderFinancials figée par la
 * migration et ne sont donc jamais reprises ici.
 */
export async function snapshotPendingOrders(limit = 20): Promise<number> {
  const pending = await prisma.order.findMany({
    where: {
      paymentStatus: 'paid',
      OR: [{ financials: { is: null } }, { financials: { is: { snapshotAt: null } } }],
    },
    select: { id: true },
    take: limit,
  })
  for (const o of pending) {
    await snapshotOrderFinancials(o.id).catch(err => logger.error('[finance/snapshot] rattrapage échoué', o.id, err))
  }
  return pending.length
}
