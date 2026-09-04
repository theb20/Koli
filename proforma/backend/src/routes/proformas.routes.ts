import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, getMembership, type AuthedRequest } from '../middleware/auth.js'
import { computeDocumentTotals, toMinorUnits, formatMoney, type Currency } from '../lib/money.js'
import { nextProformaNumber, nextInvoiceNumber } from '../lib/numbering.js'
import { renderDocumentHtml, type DocumentView } from '../pdf/renderDocumentHtml.js'
import { htmlToPdf } from '../pdf/generatePdf.js'
import { sendProformaEmail, emailConfigured } from '../lib/email.js'

export const proformasRouter = Router()
proformasRouter.use(requireAuth)

async function assertCompanyOwned(userId: string, companyId: string) {
  return (await getMembership(userId, companyId)) !== null
}

const itemSchema = z.object({
  productId: z.string().nullable().optional(),
  reference: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  quantity: z.number().positive(),
  unit: z.string().default('unité'),
  unitPrice: z.number().nonnegative(), // unité majeure
  discountPercent: z.number().min(0).max(100).default(0),
  taxId: z.string().nullable().optional(),
  taxRate: z.number().min(0).max(100).default(0),
})

const proformaSchema = z.object({
  clientId: z.string().min(1),
  reference: z.string().optional(),
  object: z.string().optional(),
  salesperson: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().nullable().optional(),
  paymentTermId: z.string().nullable().optional(),
  deliveryDelay: z.string().optional(),
  currency: z.enum(['XOF', 'EUR', 'USD', 'GBP']).default('XOF'),
  status: z.enum(['DRAFT', 'PENDING']).optional(),
  template: z.enum(['classic', 'modern', 'minimal', 'corporate', 'elegant']).default('classic'),
  customization: z.record(z.any()).nullable().optional(),
  items: z.array(itemSchema).min(1, 'Au moins une ligne de produit/service est requise'),
  discountType: z.enum(['percent', 'amount']).default('percent'),
  discountValue: z.number().min(0).default(0),
  shippingFee: z.number().min(0).default(0),
  otherFees: z.number().min(0).default(0),
  otherFeesLabel: z.string().optional(),
  deposit: z.number().min(0).default(0),
  notes: z.string().optional(),
  termsText: z.string().optional(),
  footerText: z.string().optional(),
  signatureUrl: z.string().optional(),
  stampUrl: z.string().optional(),
})

function buildTotalsAndItems(data: z.infer<typeof proformaSchema>) {
  const currency = data.currency as Currency
  const calcInput = {
    items: data.items.map((it) => ({
      quantity: it.quantity,
      unitPrice: toMinorUnits(it.unitPrice, currency),
      discountPercent: it.discountPercent,
      taxRate: it.taxRate,
    })),
    discountType: data.discountType,
    discountValue: data.discountType === 'percent' ? data.discountValue : toMinorUnits(data.discountValue, currency),
    shippingFee: toMinorUnits(data.shippingFee, currency),
    otherFees: toMinorUnits(data.otherFees, currency),
    deposit: toMinorUnits(data.deposit, currency),
  }
  const totals = computeDocumentTotals(calcInput)

  const items = data.items.map((it, i) => ({
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

  return { totals, items }
}

// ── Liste + filtres ──────────────────────────────────────────────────────
proformasRouter.get('/companies/:companyId/proformas', async (req: AuthedRequest, res) => {
  if (!(await assertCompanyOwned(req.userId!, req.params.companyId))) {
    return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  }
  const { status, q, sort = 'recent', page = '1', pageSize = '20' } = req.query as Record<string, string>

  const where: any = { companyId: req.params.companyId }
  if (status) where.status = status
  if (q) {
    where.OR = [
      { number: { contains: q, mode: 'insensitive' } },
      { object: { contains: q, mode: 'insensitive' } },
      { client: { name: { contains: q, mode: 'insensitive' } } },
    ]
  }

  const orderBy =
    sort === 'amount_desc' ? { total: 'desc' as const } : sort === 'amount_asc' ? { total: 'asc' as const } : { createdAt: 'desc' as const }

  const take = Math.min(Number(pageSize) || 20, 100)
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take

  const [proformas, count] = await Promise.all([
    prisma.proforma.findMany({
      where,
      include: { client: { select: { name: true } } },
      orderBy,
      take,
      skip,
    }),
    prisma.proforma.count({ where }),
  ])

  res.json({ success: true, proformas, total: count, page: Number(page) || 1, pageSize: take })
})

// ── Création ─────────────────────────────────────────────────────────────
proformasRouter.post('/companies/:companyId/proformas', async (req: AuthedRequest, res) => {
  if (!(await assertCompanyOwned(req.userId!, req.params.companyId))) {
    return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  }
  const parsed = proformaSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message })

  const client = await prisma.client.findFirst({ where: { id: parsed.data.clientId, companyId: req.params.companyId } })
  if (!client) return res.status(400).json({ success: false, message: 'Client invalide pour cette entreprise' })

  const { totals, items } = buildTotalsAndItems(parsed.data)
  const number = await nextProformaNumber(req.params.companyId)

  const proforma = await prisma.proforma.create({
    data: {
      companyId: req.params.companyId,
      clientId: parsed.data.clientId,
      number,
      reference: parsed.data.reference,
      object: parsed.data.object,
      salesperson: parsed.data.salesperson,
      issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : new Date(),
      expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
      paymentTermId: parsed.data.paymentTermId || null,
      deliveryDelay: parsed.data.deliveryDelay,
      currency: parsed.data.currency,
      status: parsed.data.status || 'DRAFT',
      template: parsed.data.template,
      customization: parsed.data.customization ?? undefined,
      subtotal: totals.subtotal,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      shippingFee: totals.shippingFee,
      otherFees: totals.otherFees,
      otherFeesLabel: parsed.data.otherFeesLabel,
      deposit: totals.deposit,
      total: totals.total,
      balanceDue: totals.balanceDue,
      notes: parsed.data.notes,
      termsText: parsed.data.termsText,
      footerText: parsed.data.footerText,
      signatureUrl: parsed.data.signatureUrl,
      stampUrl: parsed.data.stampUrl,
      items: { create: items },
      activity: { create: { action: 'Proforma créée', actor: 'user' } },
    },
    include: { items: true, client: true },
  })

  res.status(201).json({ success: true, proforma })
})

async function loadOwnedProforma(userId: string, id: string) {
  const proforma = await prisma.proforma.findUnique({
    where: { id },
    include: { company: true, client: true, items: { orderBy: { position: 'asc' } }, paymentTerm: true, activity: { orderBy: { createdAt: 'desc' } } },
  })
  if (!proforma) return null
  if (!(await getMembership(userId, proforma.companyId))) return null
  return proforma
}

proformasRouter.get('/proformas/:id', async (req: AuthedRequest, res) => {
  const proforma = await loadOwnedProforma(req.userId!, req.params.id)
  if (!proforma) return res.status(404).json({ success: false, message: 'Proforma introuvable' })
  res.json({ success: true, proforma })
})

proformasRouter.put('/proformas/:id', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedProforma(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Proforma introuvable' })
  if (owned.status === 'CONVERTED') {
    return res.status(409).json({ success: false, message: 'Cette proforma a été convertie en facture et ne peut plus être modifiée' })
  }

  const parsed = proformaSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message })

  const client = await prisma.client.findFirst({ where: { id: parsed.data.clientId, companyId: owned.companyId } })
  if (!client) return res.status(400).json({ success: false, message: 'Client invalide pour cette entreprise' })

  const { totals, items } = buildTotalsAndItems(parsed.data)

  const proforma = await prisma.proforma.update({
    where: { id: owned.id },
    data: {
      clientId: parsed.data.clientId,
      reference: parsed.data.reference,
      object: parsed.data.object,
      salesperson: parsed.data.salesperson,
      issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : owned.issueDate,
      expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
      paymentTermId: parsed.data.paymentTermId || null,
      deliveryDelay: parsed.data.deliveryDelay,
      currency: parsed.data.currency,
      status: parsed.data.status || owned.status,
      template: parsed.data.template,
      customization: parsed.data.customization ?? undefined,
      subtotal: totals.subtotal,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      shippingFee: totals.shippingFee,
      otherFees: totals.otherFees,
      otherFeesLabel: parsed.data.otherFeesLabel,
      deposit: totals.deposit,
      total: totals.total,
      balanceDue: totals.balanceDue,
      notes: parsed.data.notes,
      termsText: parsed.data.termsText,
      footerText: parsed.data.footerText,
      signatureUrl: parsed.data.signatureUrl,
      stampUrl: parsed.data.stampUrl,
      items: { deleteMany: {}, create: items },
      activity: { create: { action: 'Proforma modifiée', actor: 'user' } },
    },
    include: { items: true, client: true },
  })

  res.json({ success: true, proforma })
})

proformasRouter.delete('/proformas/:id', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedProforma(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Proforma introuvable' })
  await prisma.proforma.delete({ where: { id: owned.id } })
  res.json({ success: true })
})

const bulkDeleteSchema = z.object({ ids: z.array(z.string()).min(1) })
proformasRouter.post('/proformas/bulk-delete', async (req: AuthedRequest, res) => {
  const parsed = bulkDeleteSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: 'ids requis' })
  const owned = await prisma.proforma.findMany({
    where: { id: { in: parsed.data.ids }, company: { memberships: { some: { userId: req.userId } } } },
    select: { id: true },
  })
  await prisma.proforma.deleteMany({ where: { id: { in: owned.map((p) => p.id) } } })
  res.json({ success: true, deleted: owned.length })
})

// ── Duplication ───────────────────────────────────────────────────────────
proformasRouter.post('/proformas/:id/duplicate', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedProforma(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Proforma introuvable' })

  const number = await nextProformaNumber(owned.companyId)
  const duplicate = await prisma.proforma.create({
    data: {
      companyId: owned.companyId,
      clientId: owned.clientId,
      number,
      reference: owned.reference,
      object: owned.object,
      salesperson: owned.salesperson,
      issueDate: new Date(),
      expiryDate: null,
      paymentTermId: owned.paymentTermId,
      deliveryDelay: owned.deliveryDelay,
      currency: owned.currency,
      status: 'DRAFT',
      template: owned.template,
      customization: owned.customization ?? undefined,
      subtotal: owned.subtotal,
      discountType: owned.discountType,
      discountValue: owned.discountValue,
      discountAmount: owned.discountAmount,
      taxAmount: owned.taxAmount,
      shippingFee: owned.shippingFee,
      otherFees: owned.otherFees,
      otherFeesLabel: owned.otherFeesLabel,
      deposit: owned.deposit,
      total: owned.total,
      balanceDue: owned.balanceDue,
      notes: owned.notes,
      termsText: owned.termsText,
      footerText: owned.footerText,
      items: {
        create: owned.items.map((it) => ({
          productId: it.productId,
          reference: it.reference,
          name: it.name,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice,
          discountPercent: it.discountPercent,
          discountAmount: it.discountAmount,
          taxId: it.taxId,
          taxRate: it.taxRate,
          lineTotal: it.lineTotal,
          position: it.position,
        })),
      },
      activity: { create: { action: `Dupliquée depuis ${owned.number}`, actor: 'user' } },
    },
    include: { items: true, client: true },
  })

  res.status(201).json({ success: true, proforma: duplicate })
})

// ── Rendu / PDF ───────────────────────────────────────────────────────────
function toDocumentView(p: NonNullable<Awaited<ReturnType<typeof loadOwnedProforma>>>): DocumentView {
  return {
    kind: 'proforma',
    number: p.number,
    status: p.status,
    issueDate: p.issueDate.toISOString(),
    expiryDate: p.expiryDate?.toISOString() ?? null,
    reference: p.reference,
    object: p.object,
    salesperson: p.salesperson,
    paymentTermLabel: p.paymentTerm?.label ?? null,
    deliveryDelay: p.deliveryDelay,
    currency: p.currency as Currency,
    template: p.template,
    customization: (p.customization as Record<string, any>) ?? null,
    company: {
      name: p.company.name,
      address: p.company.address,
      phone: p.company.phone,
      email: p.company.email,
      website: p.company.website,
      taxId: p.company.taxId,
      rccm: p.company.rccm,
      logoUrl: p.company.logoUrl ? `${process.env.APP_API_URL || 'http://localhost:4100'}${p.company.logoUrl}` : null,
    },
    client: {
      name: p.client.name,
      contactName: p.client.contactName,
      address: p.client.address,
      phone: p.client.phone,
      email: p.client.email,
      country: p.client.country,
      taxId: p.client.taxId,
    },
    items: p.items.map((it) => ({
      reference: it.reference,
      name: it.name,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unitPrice: it.unitPrice,
      discountPercent: it.discountPercent,
      lineTotal: it.lineTotal,
      taxRate: it.taxRate,
    })),
    subtotal: p.subtotal,
    discountType: p.discountType,
    discountValue: p.discountValue,
    discountAmount: p.discountAmount,
    taxAmount: p.taxAmount,
    shippingFee: p.shippingFee,
    otherFees: p.otherFees,
    otherFeesLabel: p.otherFeesLabel,
    deposit: p.deposit,
    total: p.total,
    balanceDue: p.balanceDue,
    notes: p.notes,
    termsText: p.termsText,
    footerText: p.footerText,
    signatureUrl: p.signatureUrl,
    stampUrl: p.stampUrl,
  }
}

proformasRouter.get('/proformas/:id/pdf', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedProforma(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Proforma introuvable' })
  const html = renderDocumentHtml(toDocumentView(owned))
  const pdf = await htmlToPdf(html)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${owned.number}.pdf"`)
  res.send(pdf)
})

// ── Envoi par email ────────────────────────────────────────────────────────
proformasRouter.post('/proformas/:id/send', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedProforma(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Proforma introuvable' })
  if (!owned.client.email) {
    return res.status(400).json({ success: false, message: "Ce client n'a pas d'adresse email enregistrée" })
  }
  if (!emailConfigured) {
    return res.status(503).json({
      success: false,
      message: "Envoi d'e-mail non configuré : ajoute RESEND_API_KEY dans backend/.env pour activer cette fonctionnalité.",
    })
  }

  const html = renderDocumentHtml(toDocumentView(owned))
  const pdfBuffer = await htmlToPdf(html)
  const publicUrl = `${process.env.APP_PUBLIC_URL || 'http://localhost:5175'}/p/${owned.publicToken}`

  await sendProformaEmail({
    to: owned.client.email,
    companyName: owned.company.name,
    clientName: owned.client.name,
    documentNumber: owned.number,
    totalLabel: formatMoney(owned.total, owned.currency as Currency),
    expiryLabel: owned.expiryDate ? owned.expiryDate.toLocaleDateString('fr-FR') : undefined,
    publicUrl,
    pdfBuffer,
  })

  const proforma = await prisma.proforma.update({
    where: { id: owned.id },
    data: {
      status: owned.status === 'DRAFT' || owned.status === 'PENDING' ? 'SENT' : owned.status,
      sentAt: new Date(),
      activity: { create: { action: `Envoyée par email à ${owned.client.email}`, actor: 'user' } },
    },
    include: { items: true, client: true },
  })

  res.json({ success: true, proforma })
})

// ── Conversion en facture ───────────────────────────────────────────────────
proformasRouter.post('/proformas/:id/convert', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedProforma(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Proforma introuvable' })
  if (owned.status === 'CONVERTED') {
    return res.status(409).json({ success: false, message: 'Cette proforma a déjà été convertie' })
  }

  const number = await nextInvoiceNumber(owned.companyId)

  const invoice = await prisma.invoice.create({
    data: {
      companyId: owned.companyId,
      clientId: owned.clientId,
      number,
      reference: owned.reference,
      object: owned.object,
      salesperson: owned.salesperson,
      issueDate: new Date(),
      paymentTermId: owned.paymentTermId,
      currency: owned.currency,
      status: 'DRAFT',
      template: owned.template,
      customization: owned.customization ?? undefined,
      subtotal: owned.subtotal,
      discountType: owned.discountType,
      discountValue: owned.discountValue,
      discountAmount: owned.discountAmount,
      taxAmount: owned.taxAmount,
      shippingFee: owned.shippingFee,
      otherFees: owned.otherFees,
      otherFeesLabel: owned.otherFeesLabel,
      deposit: owned.deposit,
      total: owned.total,
      balanceDue: owned.balanceDue,
      notes: owned.notes,
      termsText: owned.termsText,
      footerText: owned.footerText,
      signatureUrl: owned.signatureUrl,
      stampUrl: owned.stampUrl,
      items: {
        create: owned.items.map((it) => ({
          productId: it.productId,
          reference: it.reference,
          name: it.name,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice,
          discountPercent: it.discountPercent,
          discountAmount: it.discountAmount,
          taxId: it.taxId,
          taxRate: it.taxRate,
          lineTotal: it.lineTotal,
          position: it.position,
        })),
      },
      activity: { create: { action: `Convertie depuis la proforma ${owned.number}`, actor: 'user' } },
    },
  })

  await prisma.proforma.update({
    where: { id: owned.id },
    data: {
      status: 'CONVERTED',
      convertedInvoiceId: invoice.id,
      activity: { create: { action: `Convertie en facture ${number}`, actor: 'user' } },
    },
  })

  // Décrément de stock (produits physiques suivis) — une conversion en
  // facture représente une vente ferme, contrairement à un simple brouillon.
  const lowStockAlerts: { productId: string; name: string; stockQuantity: number }[] = []
  const productIds = [...new Set(owned.items.map((it) => it.productId).filter((id): id is string => !!id))]
  if (productIds.length > 0) {
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, trackStock: true } })
    for (const product of products) {
      const soldQty = owned.items.filter((it) => it.productId === product.id).reduce((sum, it) => sum + it.quantity, 0)
      const newQty = Math.max(0, product.stockQuantity - soldQty)
      const updated = await prisma.product.update({ where: { id: product.id }, data: { stockQuantity: newQty } })
      if (updated.stockQuantity <= updated.lowStockThreshold) {
        lowStockAlerts.push({ productId: updated.id, name: updated.name, stockQuantity: updated.stockQuantity })
      }
    }
  }

  res.status(201).json({ success: true, invoice, lowStockAlerts })
})

// ── Changement de statut manuel ────────────────────────────────────────────
const statusSchema = z.object({ status: z.enum(['DRAFT', 'PENDING', 'SENT', 'VIEWED', 'ACCEPTED', 'REFUSED', 'EXPIRED']) })
proformasRouter.patch('/proformas/:id/status', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedProforma(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Proforma introuvable' })
  const parsed = statusSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Statut invalide' })
  const proforma = await prisma.proforma.update({
    where: { id: owned.id },
    data: { status: parsed.data.status, activity: { create: { action: `Statut changé manuellement`, actor: 'user' } } },
  })
  res.json({ success: true, proforma })
})

// ── Paiement manuel (espèces, virement, mobile money reçu hors plateforme) ──
// Conditionné par la présence d'un acompte : un document avec acompte > 0 se
// règle en deux temps (acompte puis solde), sinon un seul règlement total.
proformasRouter.post('/proformas/:id/mark-deposit-paid', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedProforma(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Proforma introuvable' })
  if (owned.deposit <= 0) {
    return res.status(400).json({ success: false, message: "Ce document n'a pas d'acompte défini" })
  }
  if (owned.depositPaidAt) {
    return res.status(409).json({ success: false, message: 'Acompte déjà marqué reçu' })
  }
  const proforma = await prisma.proforma.update({
    where: { id: owned.id },
    data: {
      depositPaidAt: new Date(),
      paymentStatus: owned.paymentStatus === 'paid' ? owned.paymentStatus : 'deposit_paid',
      paymentProvider: owned.paymentProvider || 'manual',
      activity: { create: { action: `Acompte marqué reçu manuellement (${formatMoney(owned.deposit, owned.currency as Currency)})`, actor: 'user' } },
    },
  })
  res.json({ success: true, proforma })
})

proformasRouter.post('/proformas/:id/mark-paid', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedProforma(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Proforma introuvable' })
  if (owned.paymentStatus === 'paid') {
    return res.status(409).json({ success: false, message: 'Déjà marquée payée' })
  }
  const amountLabel = formatMoney(owned.deposit > 0 ? owned.balanceDue : owned.total, owned.currency as Currency)
  const action =
    owned.deposit > 0
      ? `Solde marqué reçu manuellement (${amountLabel}) — paiement intégral`
      : `Marquée payée manuellement (${amountLabel})`

  const proforma = await prisma.proforma.update({
    where: { id: owned.id },
    data: {
      paidAt: new Date(),
      paymentStatus: 'paid',
      paymentProvider: owned.paymentProvider || 'manual',
      // Si l'acompte n'avait pas été pointé séparément, le paiement intégral l'inclut implicitement.
      depositPaidAt: owned.deposit > 0 && !owned.depositPaidAt ? new Date() : owned.depositPaidAt,
      activity: { create: { action, actor: 'user' } },
    },
  })
  res.json({ success: true, proforma })
})
