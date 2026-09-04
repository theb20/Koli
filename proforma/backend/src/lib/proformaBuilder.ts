import { prisma } from './prisma.js'
import { computeDocumentTotals, toMinorUnits, type Currency } from './money.js'
import { nextProformaNumber } from './numbering.js'

export interface ContentItem {
  productId?: string | null
  reference?: string
  name: string
  description?: string
  quantity: number
  unit: string
  unitPrice: number // unité majeure
  discountPercent: number
  taxId?: string | null
  taxRate: number
}

/**
 * Contenu réutilisable pour générer une proforma — utilisé à la fois par les
 * ProformaTemplate (démarrage manuel) et les RecurringPlan (génération
 * automatique par le scheduler). Toujours en unité majeure côté items/fees,
 * converti en centimes à la création comme pour l'éditeur normal.
 */
export interface ProformaContent {
  items: ContentItem[]
  discountType: 'percent' | 'amount'
  discountValue: number
  shippingFee: number
  otherFees: number
  otherFeesLabel?: string
  deposit: number
  template: string
  customization?: Record<string, unknown> | null
  notes?: string
  termsText?: string
  footerText?: string
  paymentTermId?: string | null
  expiryDays?: number
  deliveryDelay?: string
  object?: string
  salesperson?: string
}

export async function createProformaFromContent(opts: {
  companyId: string
  clientId: string
  currency: Currency
  content: ProformaContent
  activityLabel: string
  recurringPlanId?: string
}) {
  const currency = opts.currency
  const content = opts.content

  const calcInput = {
    items: content.items.map((it) => ({
      quantity: it.quantity,
      unitPrice: toMinorUnits(it.unitPrice, currency),
      discountPercent: it.discountPercent,
      taxRate: it.taxRate,
    })),
    discountType: content.discountType,
    discountValue: content.discountType === 'percent' ? content.discountValue : toMinorUnits(content.discountValue, currency),
    shippingFee: toMinorUnits(content.shippingFee, currency),
    otherFees: toMinorUnits(content.otherFees, currency),
    deposit: toMinorUnits(content.deposit, currency),
  }
  const totals = computeDocumentTotals(calcInput)

  const items = content.items.map((it, i) => ({
    productId: it.productId || null,
    reference: it.reference,
    name: it.name,
    description: it.description,
    quantity: it.quantity,
    unit: it.unit,
    unitPrice: toMinorUnits(it.unitPrice, currency),
    discountPercent: it.discountPercent,
    discountAmount: totals.lines[i].discountAmount,
    taxId: it.taxId || null,
    taxRate: it.taxRate,
    lineTotal: totals.lines[i].lineTotal,
    position: i,
  }))

  const number = await nextProformaNumber(opts.companyId)
  const issueDate = new Date()
  const expiryDate = content.expiryDays ? new Date(issueDate.getTime() + content.expiryDays * 86_400_000) : null

  return prisma.proforma.create({
    data: {
      companyId: opts.companyId,
      clientId: opts.clientId,
      number,
      object: content.object,
      salesperson: content.salesperson,
      issueDate,
      expiryDate,
      paymentTermId: content.paymentTermId || null,
      deliveryDelay: content.deliveryDelay,
      currency,
      status: 'DRAFT',
      template: content.template,
      customization: (content.customization ?? undefined) as any,
      subtotal: totals.subtotal,
      discountType: content.discountType,
      discountValue: content.discountValue,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      shippingFee: totals.shippingFee,
      otherFees: totals.otherFees,
      otherFeesLabel: content.otherFeesLabel,
      deposit: totals.deposit,
      total: totals.total,
      balanceDue: totals.balanceDue,
      notes: content.notes,
      termsText: content.termsText,
      footerText: content.footerText,
      recurringPlanId: opts.recurringPlanId,
      items: { create: items },
      activity: { create: { action: opts.activityLabel, actor: 'system' } },
    },
    include: { items: true, client: true },
  })
}
