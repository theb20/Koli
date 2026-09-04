import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, getMembership, type AuthedRequest } from '../middleware/auth.js'
import { renderDocumentHtml, type DocumentView } from '../pdf/renderDocumentHtml.js'
import { htmlToPdf } from '../pdf/generatePdf.js'
import { formatMoney, type Currency } from '../lib/money.js'

export const invoicesRouter = Router()
invoicesRouter.use(requireAuth)

async function assertCompanyOwned(userId: string, companyId: string) {
  return (await getMembership(userId, companyId)) !== null
}

invoicesRouter.get('/companies/:companyId/invoices', async (req: AuthedRequest, res) => {
  if (!(await assertCompanyOwned(req.userId!, req.params.companyId))) {
    return res.status(404).json({ success: false, message: 'Entreprise introuvable' })
  }
  const invoices = await prisma.invoice.findMany({
    where: { companyId: req.params.companyId },
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ success: true, invoices })
})

async function loadOwnedInvoice(userId: string, id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { company: true, client: true, items: { orderBy: { position: 'asc' } }, paymentTerm: true },
  })
  if (!invoice) return null
  if (!(await getMembership(userId, invoice.companyId))) return null
  return invoice
}

invoicesRouter.get('/invoices/:id', async (req: AuthedRequest, res) => {
  const invoice = await loadOwnedInvoice(req.userId!, req.params.id)
  if (!invoice) return res.status(404).json({ success: false, message: 'Facture introuvable' })
  res.json({ success: true, invoice })
})

function toDocumentView(inv: NonNullable<Awaited<ReturnType<typeof loadOwnedInvoice>>>): DocumentView {
  return {
    kind: 'invoice',
    number: inv.number,
    status: inv.status,
    issueDate: inv.issueDate.toISOString(),
    expiryDate: inv.dueDate?.toISOString() ?? null,
    reference: inv.reference,
    object: inv.object,
    salesperson: inv.salesperson,
    paymentTermLabel: inv.paymentTerm?.label ?? null,
    currency: inv.currency as Currency,
    template: inv.template,
    customization: (inv.customization as Record<string, any>) ?? null,
    company: {
      name: inv.company.name,
      address: inv.company.address,
      phone: inv.company.phone,
      email: inv.company.email,
      website: inv.company.website,
      taxId: inv.company.taxId,
      rccm: inv.company.rccm,
      logoUrl: inv.company.logoUrl ? `${process.env.APP_API_URL || 'http://localhost:4100'}${inv.company.logoUrl}` : null,
    },
    client: {
      name: inv.client.name,
      contactName: inv.client.contactName,
      address: inv.client.address,
      phone: inv.client.phone,
      email: inv.client.email,
      country: inv.client.country,
      taxId: inv.client.taxId,
    },
    items: inv.items.map((it) => ({
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
    subtotal: inv.subtotal,
    discountType: inv.discountType,
    discountValue: inv.discountValue,
    discountAmount: inv.discountAmount,
    taxAmount: inv.taxAmount,
    shippingFee: inv.shippingFee,
    otherFees: inv.otherFees,
    otherFeesLabel: inv.otherFeesLabel,
    deposit: inv.deposit,
    total: inv.total,
    balanceDue: inv.balanceDue,
    notes: inv.notes,
    termsText: inv.termsText,
    footerText: inv.footerText,
    signatureUrl: inv.signatureUrl,
    stampUrl: inv.stampUrl,
  }
}

invoicesRouter.get('/invoices/:id/pdf', async (req: AuthedRequest, res) => {
  const invoice = await loadOwnedInvoice(req.userId!, req.params.id)
  if (!invoice) return res.status(404).json({ success: false, message: 'Facture introuvable' })
  const html = renderDocumentHtml(toDocumentView(invoice))
  const pdf = await htmlToPdf(html)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${invoice.number}.pdf"`)
  res.send(pdf)
})

// Paiement manuel (espèces, virement, mobile money reçu hors plateforme) —
// conditionné par la présence d'un acompte, comme pour les proformas.
invoicesRouter.post('/invoices/:id/mark-deposit-paid', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedInvoice(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Facture introuvable' })
  if (owned.deposit <= 0) return res.status(400).json({ success: false, message: "Cette facture n'a pas d'acompte défini" })
  if (owned.depositPaidAt) return res.status(409).json({ success: false, message: 'Acompte déjà marqué reçu' })

  const invoice = await prisma.invoice.update({
    where: { id: owned.id },
    data: {
      status: 'PARTIALLY_PAID',
      depositPaidAt: new Date(),
      paymentStatus: owned.paymentStatus === 'paid' ? owned.paymentStatus : 'deposit_paid',
      paymentProvider: owned.paymentProvider || 'manual',
      activity: { create: { action: `Acompte marqué reçu manuellement (${formatMoney(owned.deposit, owned.currency as Currency)})`, actor: 'user' } },
    },
  })
  res.json({ success: true, invoice })
})

invoicesRouter.post('/invoices/:id/mark-paid', async (req: AuthedRequest, res) => {
  const owned = await loadOwnedInvoice(req.userId!, req.params.id)
  if (!owned) return res.status(404).json({ success: false, message: 'Facture introuvable' })

  const amountLabel = formatMoney(owned.deposit > 0 ? owned.balanceDue : owned.total, owned.currency as Currency)
  const action = owned.deposit > 0 ? `Solde marqué reçu manuellement (${amountLabel}) — paiement intégral` : `Marquée payée manuellement (${amountLabel})`

  const invoice = await prisma.invoice.update({
    where: { id: owned.id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      paymentStatus: 'paid',
      paymentProvider: owned.paymentProvider || 'manual',
      depositPaidAt: owned.deposit > 0 && !owned.depositPaidAt ? new Date() : owned.depositPaidAt,
      activity: { create: { action, actor: 'user' } },
    },
  })
  res.json({ success: true, invoice })
})
