import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import { renderDocumentHtml, type DocumentView } from '../pdf/renderDocumentHtml.js'
import { htmlToPdf } from '../pdf/generatePdf.js'
import { formatMoney, type Currency } from '../lib/money.js'
import { notifyCompany } from '../lib/notifications.js'
import { cinetpayConfigured, initiatePayment, checkPaymentStatus } from '../payment/cinetpay.js'
import { emailConfigured, sendActivityNotificationEmail } from '../lib/email.js'

async function notifyAdminsByEmail(companyId: string, opts: { documentNumber: string; action: string; proformaId: string; companyName: string }) {
  if (!emailConfigured) return
  const admins = await prisma.membership.findMany({
    where: { companyId, role: 'ADMIN' },
    include: { user: { select: { email: true } } },
  })
  const appUrl = `${process.env.APP_PUBLIC_URL || 'http://localhost:5175'}/proformas/${opts.proformaId}`
  await Promise.allSettled(
    admins.map((a) =>
      sendActivityNotificationEmail({
        to: a.user.email,
        companyName: opts.companyName,
        documentNumber: opts.documentNumber,
        action: opts.action,
        publicOrAppUrl: appUrl,
      })
    )
  )
}

export const publicRouter = Router()

const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120 })
publicRouter.use(publicLimiter)

async function loadByToken(token: string) {
  return prisma.proforma.findUnique({
    where: { publicToken: token },
    include: { company: true, client: true, items: { orderBy: { position: 'asc' } }, paymentTerm: true },
  })
}

function toDocumentView(p: NonNullable<Awaited<ReturnType<typeof loadByToken>>>): DocumentView {
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

publicRouter.get('/proformas/:token', async (req, res) => {
  const proforma = await loadByToken(req.params.token)
  if (!proforma) return res.status(404).json({ success: false, message: 'Document introuvable' })

  if (proforma.status === 'SENT') {
    await prisma.proforma.update({
      where: { id: proforma.id },
      data: { status: 'VIEWED', viewedAt: new Date(), activity: { create: { action: 'Consultée par le client', actor: 'client' } } },
    })
    proforma.status = 'VIEWED'
    await notifyCompany(proforma.companyId, {
      type: 'proforma_viewed',
      message: `${proforma.client.name} a consulté la proforma ${proforma.number}`,
      link: `/proformas/${proforma.id}`,
    })
  }

  res.json({
    success: true,
    proforma: toDocumentView(proforma),
    id: proforma.id,
    status: proforma.status,
    paymentEnabled: cinetpayConfigured,
    paymentStatus: proforma.paymentStatus,
    paymentProvider: proforma.paymentProvider,
  })
})

publicRouter.get('/proformas/:token/pdf', async (req, res) => {
  const proforma = await loadByToken(req.params.token)
  if (!proforma) return res.status(404).json({ success: false, message: 'Document introuvable' })
  const html = renderDocumentHtml(toDocumentView(proforma))
  const pdf = await htmlToPdf(html)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${proforma.number}.pdf"`)
  res.send(pdf)
})

const uploadsDir = path.resolve('uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

/** Décode un data URL PNG (signature dessinée au canvas) et l'enregistre comme un vrai fichier. */
function saveSignatureDataUrl(dataUrl: string): string | null {
  const match = /^data:image\/png;base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl)
  if (!match) return null
  const buffer = Buffer.from(match[1], 'base64')
  if (buffer.length > 1_000_000) return null // 1MB max, une signature ne devrait jamais approcher ça
  const filename = `sig-${crypto.randomUUID()}.png`
  fs.writeFileSync(path.join(uploadsDir, filename), buffer)
  return `/uploads/${filename}`
}

const acceptSchema = z.object({
  signerName: z.string().min(1, 'Le nom du signataire est requis'),
  signatureDataUrl: z.string().nullable().optional(),
})

publicRouter.post('/proformas/:token/accept', async (req, res) => {
  const proforma = await loadByToken(req.params.token)
  if (!proforma) return res.status(404).json({ success: false, message: 'Document introuvable' })
  if (proforma.status === 'CONVERTED' || proforma.status === 'ACCEPTED') {
    return res.json({ success: true, status: proforma.status })
  }

  const parsed = acceptSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Nom du signataire requis' })

  const signatureUrl = parsed.data.signatureDataUrl ? saveSignatureDataUrl(parsed.data.signatureDataUrl) : null

  await prisma.proforma.update({
    where: { id: proforma.id },
    data: {
      status: 'ACCEPTED',
      respondedAt: new Date(),
      acceptedByName: parsed.data.signerName,
      acceptedIp: req.ip,
      signatureUrl: signatureUrl || proforma.signatureUrl,
      activity: { create: { action: `Acceptée en ligne par ${parsed.data.signerName}`, actor: 'client' } },
    },
  })

  await notifyCompany(proforma.companyId, {
    type: 'proforma_accepted',
    message: `${proforma.client.name} a accepté la proforma ${proforma.number} (signé par ${parsed.data.signerName})`,
    link: `/proformas/${proforma.id}`,
  })
  await notifyAdminsByEmail(proforma.companyId, {
    documentNumber: proforma.number,
    action: 'Proforma acceptée',
    proformaId: proforma.id,
    companyName: proforma.company.name,
  }).catch(() => {})

  res.json({ success: true, status: 'ACCEPTED' })
})

publicRouter.post('/proformas/:token/refuse', async (req, res) => {
  const proforma = await loadByToken(req.params.token)
  if (!proforma) return res.status(404).json({ success: false, message: 'Document introuvable' })
  if (proforma.status === 'CONVERTED') {
    return res.status(409).json({ success: false, message: 'Cette proforma a déjà été convertie en facture' })
  }
  await prisma.proforma.update({
    where: { id: proforma.id },
    data: { status: 'REFUSED', respondedAt: new Date(), activity: { create: { action: 'Refusée par le client', actor: 'client' } } },
  })
  await notifyCompany(proforma.companyId, {
    type: 'proforma_refused',
    message: `${proforma.client.name} a refusé la proforma ${proforma.number}`,
    link: `/proformas/${proforma.id}`,
  })
  res.json({ success: true, status: 'REFUSED' })
})

// ── Paiement en ligne (CinetPay) ────────────────────────────────────────────
publicRouter.post('/proformas/:token/payment-link', async (req, res) => {
  const proforma = await loadByToken(req.params.token)
  if (!proforma) return res.status(404).json({ success: false, message: 'Document introuvable' })
  if (!cinetpayConfigured) {
    return res.status(503).json({
      success: false,
      message: 'Paiement en ligne non configuré : ajoute CINETPAY_API_KEY et CINETPAY_SITE_ID dans backend/.env pour activer cette fonctionnalité.',
    })
  }
  if (!['XOF', 'EUR', 'USD'].includes(proforma.currency)) {
    return res.status(400).json({ success: false, message: 'Devise non supportée par CinetPay pour ce document' })
  }

  const amountDue = proforma.balanceDue > 0 ? proforma.balanceDue : proforma.total
  const transactionId = `${proforma.number}-${Date.now()}`

  try {
    const result = await initiatePayment({
      transactionId,
      amount: amountDue, // XOF n'a pas de décimales : centimes == unité majeure
      currency: proforma.currency as 'XOF' | 'EUR' | 'USD',
      description: `Paiement proforma ${proforma.number} — ${proforma.company.name}`,
      customerName: proforma.client.name,
      customerEmail: proforma.client.email,
      customerPhone: proforma.client.phone,
      returnUrl: `${process.env.APP_PUBLIC_URL || 'http://localhost:5175'}/p/${proforma.publicToken}?payment=return`,
      notifyUrl: `${process.env.APP_API_URL || 'http://localhost:4100'}/api/public/payment/cinetpay/webhook`,
    })

    await prisma.proforma.update({
      where: { id: proforma.id },
      data: { paymentProvider: 'cinetpay', paymentRef: transactionId, paymentStatus: 'pending' },
    })

    res.json({ success: true, paymentUrl: result.paymentUrl })
  } catch (err: any) {
    res.status(502).json({ success: false, message: err.message || 'Échec de l’initialisation du paiement' })
  }
})

/**
 * Mode démonstration : simule le paiement SANS passer par CinetPay, pour
 * pouvoir montrer le flux complet avant d'avoir de vraies clés marchand.
 * Verrouillé dès que CinetPay est réellement configuré, pour ne jamais
 * coexister avec un vrai paiement (le provider reste explicitement préfixé
 * "demo-" partout : activité, statut, jamais confondu avec un vrai paiement
 * dans l'historique ou un export).
 */
const demoMethodSchema = z.object({ method: z.enum(['wave', 'orange_money', 'mtn_money', 'card']) })
const DEMO_METHOD_LABEL: Record<string, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  mtn_money: 'MTN Mobile Money',
  card: 'Carte bancaire',
}

publicRouter.post('/proformas/:token/payment-demo/complete', async (req, res) => {
  const proforma = await loadByToken(req.params.token)
  if (!proforma) return res.status(404).json({ success: false, message: 'Document introuvable' })
  if (cinetpayConfigured) {
    return res.status(409).json({ success: false, message: 'Le paiement en ligne réel est actif : le mode démonstration est désactivé.' })
  }
  const parsed = demoMethodSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ success: false, message: 'Moyen de paiement invalide' })

  await prisma.proforma.update({
    where: { id: proforma.id },
    data: {
      paymentProvider: `demo-${parsed.data.method}`,
      paymentRef: `DEMO-${Date.now()}`,
      paymentStatus: 'paid',
      paidAt: new Date(),
      activity: {
        create: { action: `Paiement simulé (DÉMO — ${DEMO_METHOD_LABEL[parsed.data.method]}), aucun fonds réel transféré`, actor: 'client' },
      },
    },
  })

  await notifyCompany(proforma.companyId, {
    type: 'payment_received_demo',
    message: `Paiement DÉMO reçu pour la proforma ${proforma.number} (${DEMO_METHOD_LABEL[parsed.data.method]}) — aucun fonds réel`,
    link: `/proformas/${proforma.id}`,
  })

  res.json({ success: true, paymentStatus: 'paid', demo: true })
})

/** Webhook CinetPay (notify_url) — ne fait jamais confiance au payload seul, revérifie toujours via checkPaymentStatus. */
publicRouter.post('/payment/cinetpay/webhook', async (req, res) => {
  const transactionId = req.body?.cpm_trans_id || req.body?.transaction_id
  if (!transactionId) return res.status(400).send('missing transaction_id')

  const proforma = await prisma.proforma.findFirst({ where: { paymentRef: transactionId }, include: { client: true, company: true } })
  if (!proforma) return res.status(404).send('not found')

  try {
    const status = await checkPaymentStatus(transactionId)
    if (status.status === 'ACCEPTED') {
      await prisma.proforma.update({
        where: { id: proforma.id },
        data: {
          paymentStatus: 'paid',
          paidAt: new Date(),
          activity: { create: { action: `Paiement reçu via CinetPay (${status.paymentMethod || 'mobile money/carte'})`, actor: 'client' } },
        },
      })
      await notifyCompany(proforma.companyId, {
        type: 'payment_received',
        message: `Paiement reçu pour la proforma ${proforma.number}`,
        link: `/proformas/${proforma.id}`,
      })
      await notifyAdminsByEmail(proforma.companyId, {
        documentNumber: proforma.number,
        action: 'Paiement reçu',
        proformaId: proforma.id,
        companyName: proforma.company.name,
      }).catch(() => {})
    } else if (status.status === 'REFUSED') {
      await prisma.proforma.update({ where: { id: proforma.id }, data: { paymentStatus: 'failed' } })
    }
  } catch (err) {
    console.error('[cinetpay webhook] échec de vérification:', err)
  }

  res.status(200).send('ok')
})

publicRouter.get('/proformas/:token/payment-status', async (req, res) => {
  const proforma = await loadByToken(req.params.token)
  if (!proforma) return res.status(404).json({ success: false, message: 'Document introuvable' })
  res.json({ success: true, paymentStatus: proforma.paymentStatus, paidAt: proforma.paidAt })
})
