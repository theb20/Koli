import PDFDocument from 'pdfkit'
import type { Order, OrderItem } from '@prisma/client'
import type { SiteSettings } from '@prisma/client'

const PAYMENT_LABELS: Record<string, string> = {
  orange: 'Orange Money',
  mtn:    'MTN Mobile Money',
  wave:   'Wave',
  cash:   'Paiement à la livraison',
}

const STATUS_STYLES: Record<string, { label: string; bg: string; fg: string }> = {
  pending:  { label: 'En attente', bg: '#fef7e0', fg: '#b06000' },
  paid:     { label: 'Payée',      bg: '#e6f4ea', fg: '#188038' },
  failed:   { label: 'Échouée',    bg: '#fce8e6', fg: '#c5221f' },
  refunded: { label: 'Remboursée', bg: '#e8f0fe', fg: '#1967d2' },
}

// Palette reprise de l'email de bienvenue Skignas
const C = {
  text:      '#202124',
  textSub:   '#5f6368',
  textFaint: '#9aa0a6',
  border:    '#e8eaed',
  bgLight:   '#f8f9fa',
  blueBg:    '#e8f0fe',
  blueDark:  '#1967d2',
}

const BAR_COLORS = ['#4285f4', '#ea4335', '#fbbc05', '#34a853']

const MONTH_LABELS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

const PAYOUT_LABELS: Record<string, string> = {
  none:                 'En attente de clôture',
  requested:            'Versé automatiquement (Mobile Money)',
  skipped_no_method:    'Non versé — aucun numéro Mobile Money configuré',
  skipped_non_positive: 'Aucun versement — montant net non positif ce mois-ci',
  failed:               'Échec du versement — vérification en cours par Skignas',
}

function fmt(n: number): string {
  // toLocaleString('fr-FR') insère un espace fine insécable (U+202F) comme séparateur
  // de milliers — la police par défaut de pdfkit ne le supporte pas et affiche un
  // glyphe de remplacement. On force un espace ASCII classique à la place.
  const digits = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return digits + ' FCFA'
}

type OrderWithItems = Order & { items: OrderItem[] }

function drawBrandBar(doc: PDFKit.PDFDocument, x: number, y: number, width: number) {
  const seg = width / BAR_COLORS.length
  BAR_COLORS.forEach((color, i) => {
    doc.rect(x + i * seg, y, seg, 3).fill(color)
  })
}

/** Construit le PDF de facture pour une commande — le document reste à .end() par l'appelant. */
export function buildInvoicePdf(order: OrderWithItems, settings: SiteSettings): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 50 })

  let shippingAddr: { ville?: string; quartier?: string; adresse?: string } = {}
  try { shippingAddr = JSON.parse(order.shippingAddress) } catch { /* ignore */ }
  const addressLine = [shippingAddr.adresse, shippingAddr.quartier, shippingAddr.ville].filter(Boolean).join(', ')

  /* ── En-tête ── */
  doc.font('Helvetica-Bold').fontSize(22).fillColor(C.text).text('Skignas', 50, 50)
  doc.font('Helvetica').fontSize(9).fillColor(C.textSub)
    .text(settings.address, 50, 80)
    .text(`${settings.supportEmail} · ${settings.supportPhone}`, 50, 94)

  doc.font('Helvetica-Bold').fontSize(18).fillColor(C.text)
    .text('FACTURE', 350, 50, { width: 195, align: 'right' })
  doc.font('Helvetica').fontSize(10).fillColor(C.textSub)
    .text(`N° ${order.orderNumber}`, 350, 76, { width: 195, align: 'right' })
    .text(new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }), 350, 90, { width: 195, align: 'right' })

  // Bandeau 4 couleurs, signature Skignas (repris de l'email)
  drawBrandBar(doc, 50, 118, 495)

  /* ── Badge de statut de paiement ── */
  const status = STATUS_STYLES[order.paymentStatus] ?? { label: order.paymentStatus, bg: C.bgLight, fg: C.textSub }
  doc.font('Helvetica-Bold').fontSize(9)
  const badgeW = doc.widthOfString(status.label) + 20
  const badgeX = 545 - badgeW
  doc.roundedRect(badgeX, 134, badgeW, 20, 10).fill(status.bg)
  doc.fillColor(status.fg).text(status.label, badgeX, 140, { width: badgeW, align: 'center' })

  /* ── Client / livraison ── */
  let y = 172
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.textFaint).text('FACTURÉ À', 50, y)
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.text)
    .text(`${order.clientPrenom} ${order.clientNom}`, 50, y + 14)
  doc.font('Helvetica').fontSize(9).fillColor(C.textSub)
    .text(order.clientEmail, 50, y + 30)
    .text(order.clientTelephone, 50, y + 44)

  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.textFaint).text('LIVRAISON', 300, y)
  doc.font('Helvetica').fontSize(9).fillColor(C.textSub)
    .text(addressLine || '—', 300, y + 14, { width: 245 })
    .text(order.deliveryMethod === 'express' ? 'Express · 24-72h' : 'Standard · 3-5 jours', 300, y + 44)

  /* ── Tableau des articles ── */
  y = 254
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.textFaint)
    .text('ARTICLE', 50, y)
    .text('QTÉ', 340, y, { width: 40, align: 'right' })
    .text('PRIX UNIT.', 390, y, { width: 75, align: 'right' })
    .text('TOTAL', 470, y, { width: 75, align: 'right' })
  y += 16
  doc.moveTo(50, y).lineTo(545, y).strokeColor(C.border).stroke()
  y += 10

  for (const item of order.items) {
    const lineTotal = item.price * item.qty
    const nameHeight = doc.font('Helvetica').fontSize(10).heightOfString(item.name, { width: 270 })
    doc.fillColor(C.text).text(item.name, 50, y, { width: 270 })
    doc.fillColor(C.textSub)
      .text(String(item.qty), 340, y, { width: 40, align: 'right' })
      .text(fmt(item.price), 390, y, { width: 75, align: 'right' })
      .fillColor(C.text)
      .text(fmt(lineTotal), 470, y, { width: 75, align: 'right' })
    y += Math.max(nameHeight, 14) + 10
  }

  doc.moveTo(50, y).lineTo(545, y).strokeColor(C.border).stroke()
  y += 14

  /* ── Totaux ── */
  const totalsRow = (label: string, value: string, opts: { bold?: boolean; color?: string } = {}) => {
    doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.bold ? 12 : 10)
      .fillColor(opts.color ?? (opts.bold ? C.text : C.textSub))
      .text(label, 350, y, { width: 115 })
      .text(value, 470, y, { width: 75, align: 'right' })
    y += opts.bold ? 20 : 16
  }

  totalsRow('Sous-total', fmt(order.subtotal))
  totalsRow('Livraison', fmt(order.shippingCost))
  if (order.promoDiscount > 0) totalsRow(`Promo${order.promoCode ? ` (${order.promoCode})` : ''}`, `-${fmt(order.promoDiscount)}`, { color: '#188038' })
  if (order.taxAmount > 0) totalsRow(`TVA (${order.taxRate.toFixed(0)}%)`, fmt(order.taxAmount))
  y += 4
  doc.moveTo(350, y).lineTo(545, y).strokeColor(C.border).stroke()
  y += 10

  // Pastille bleue pour le total, comme le CTA de l'email
  doc.roundedRect(345, y - 6, 200, 28, 8).fill(C.blueBg)
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.blueDark)
    .text('Total', 358, y + 2, { width: 100 })
    .text(fmt(order.total), 460, y + 2, { width: 78, align: 'right' })
  y += 40

  /* ── Paiement ── */
  doc.roundedRect(50, y, 495, 36, 10).fill(C.bgLight)
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.textFaint).text('PAIEMENT', 66, y + 8)
  doc.font('Helvetica').fontSize(10).fillColor(C.text)
    .text(PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod, 66, y + 20)

  /* ── Pied de page ── */
  doc.font('Helvetica').fontSize(8).fillColor(C.textFaint)
    .text('Merci pour votre confiance — Skignas, marketplace tech en Côte d\'Ivoire.', 50, 760, { width: 495, align: 'center' })

  return doc
}

/**
 * Récapitulatif marchand — contrairement à buildInvoicePdf (facture client
 * complète), ne montre QUE les lignes appartenant à la boutique du marchand
 * connecté. Une commande peut mélanger les produits de plusieurs boutiques ;
 * exposer le sous-total ou la TVA de la commande entière donnerait au
 * marchand une vue sur ce que vendent ses concurrents dans la même commande.
 * Ni TVA, ni promo, ni total de commande ici — seulement le sous-total de
 * ses propres articles.
 */
export function buildMerchantOrderPdf(order: Order, items: OrderItem[], storeName: string): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 50 })

  let shippingAddr: { ville?: string; quartier?: string; adresse?: string } = {}
  try { shippingAddr = JSON.parse(order.shippingAddress) } catch { /* ignore */ }
  const addressLine = [shippingAddr.adresse, shippingAddr.quartier, shippingAddr.ville].filter(Boolean).join(', ')

  /* ── En-tête ── */
  doc.font('Helvetica-Bold').fontSize(22).fillColor(C.text).text(storeName, 50, 50, { width: 300 })
  doc.font('Helvetica').fontSize(9).fillColor(C.textSub).text('Boutique partenaire Skignas', 50, 80)

  doc.font('Helvetica-Bold').fontSize(16).fillColor(C.text)
    .text('RÉCAPITULATIF', 350, 50, { width: 195, align: 'right' })
  doc.font('Helvetica').fontSize(9).fillColor(C.textSub)
    .text(`Commande ${order.orderNumber}`, 350, 74, { width: 195, align: 'right' })
    .text(new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }), 350, 88, { width: 195, align: 'right' })

  drawBrandBar(doc, 50, 112, 495)

  doc.font('Helvetica').fontSize(8).fillColor(C.textFaint)
    .text('Ne couvre que les articles de cette boutique — la commande peut inclure d\'autres boutiques.', 50, 126, { width: 495 })

  /* ── Client / livraison ── */
  let y = 158
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.textFaint).text('CLIENT', 50, y)
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.text)
    .text(`${order.clientPrenom} ${order.clientNom}`, 50, y + 14)
  doc.font('Helvetica').fontSize(9).fillColor(C.textSub)
    .text(order.clientEmail, 50, y + 30)
    .text(order.clientTelephone, 50, y + 44)

  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.textFaint).text('LIVRAISON', 300, y)
  doc.font('Helvetica').fontSize(9).fillColor(C.textSub)
    .text(addressLine || '—', 300, y + 14, { width: 245 })
    .text(order.deliveryMethod === 'express' ? 'Express · 24-72h' : 'Standard · 3-5 jours', 300, y + 44)

  /* ── Tableau des articles (boutique uniquement) ── */
  y = 240
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.textFaint)
    .text('ARTICLE', 50, y)
    .text('QTÉ', 340, y, { width: 40, align: 'right' })
    .text('PRIX UNIT.', 390, y, { width: 75, align: 'right' })
    .text('TOTAL', 470, y, { width: 75, align: 'right' })
  y += 16
  doc.moveTo(50, y).lineTo(545, y).strokeColor(C.border).stroke()
  y += 10

  let storeSubtotal = 0
  for (const item of items) {
    const lineTotal = item.price * item.qty
    storeSubtotal += lineTotal
    const nameHeight = doc.font('Helvetica').fontSize(10).heightOfString(item.name, { width: 270 })
    doc.fillColor(C.text).text(item.name, 50, y, { width: 270 })
    doc.fillColor(C.textSub)
      .text(String(item.qty), 340, y, { width: 40, align: 'right' })
      .text(fmt(item.price), 390, y, { width: 75, align: 'right' })
      .fillColor(C.text)
      .text(fmt(lineTotal), 470, y, { width: 75, align: 'right' })
    y += Math.max(nameHeight, 14) + 10
  }

  doc.moveTo(50, y).lineTo(545, y).strokeColor(C.border).stroke()
  y += 14

  // Pastille bleue — sous-total de la boutique uniquement, jamais le total de la commande.
  doc.roundedRect(345, y - 6, 200, 28, 8).fill(C.blueBg)
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.blueDark)
    .text('Sous-total', 358, y + 3, { width: 100 })
    .text(fmt(storeSubtotal), 445, y + 3, { width: 93, align: 'right' })
  y += 40

  /* ── Pied de page ── */
  doc.font('Helvetica').fontSize(8).fillColor(C.textFaint)
    .text('Skignas, marketplace tech en Côte d\'Ivoire — récapitulatif à usage interne, ne constitue pas une facture.', 50, 760, { width: 495, align: 'center' })

  return doc
}

type SettlementLike = {
  period_start: string
  gross_amount: number
  commission_amount: number
  net_amount: number
  transaction_count: number
  payout_status: string
  payout_reference?: string | null
  payout_operator?: string | null
  payout_phone?: string | null
  paid_out_at?: string | null
}

/**
 * Fiche de relevé mensuel — le document que Skignas envoie chaque mois au
 * marchand (ventes, commission, net ET statut du versement Mobile Money
 * automatique, voir merchantgo SettlementService). Skignas → marchand
 * uniquement, jamais l'inverse (voir order_payment_architecture).
 */
export function buildSettlementPdf(s: SettlementLike, storeName: string): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 50 })

  const periodDate = new Date(s.period_start)
  const monthLabel = MONTH_LABELS_FR[periodDate.getUTCMonth()]
  const periodLabel = `${monthLabel!.charAt(0).toUpperCase()}${monthLabel!.slice(1)} ${periodDate.getUTCFullYear()}`

  /* ── En-tête ── */
  doc.font('Helvetica-Bold').fontSize(22).fillColor(C.text).text('Skignas', 50, 50)
  doc.font('Helvetica').fontSize(9).fillColor(C.textSub).text('Marketplace tech en Côte d\'Ivoire', 50, 80)

  doc.font('Helvetica-Bold').fontSize(18).fillColor(C.text)
    .text('RELEVÉ MENSUEL', 300, 50, { width: 245, align: 'right' })
  doc.font('Helvetica').fontSize(10).fillColor(C.textSub)
    .text(periodLabel, 300, 76, { width: 245, align: 'right' })

  drawBrandBar(doc, 50, 100, 495)

  /* ── Boutique ── */
  let y = 134
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.textFaint).text('BOUTIQUE', 50, y)
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.text).text(storeName, 50, y + 14, { width: 495 })

  y += 50
  doc.moveTo(50, y).lineTo(545, y).strokeColor(C.border).stroke()
  y += 20

  /* ── Détail du calcul ── */
  const row = (label: string, value: string, opts: { bold?: boolean; color?: string } = {}) => {
    doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.bold ? 12 : 10)
      .fillColor(opts.color ?? (opts.bold ? C.text : C.textSub))
      .text(label, 50, y, { width: 300 })
      .text(value, 350, y, { width: 195, align: 'right' })
    y += opts.bold ? 22 : 18
  }

  row('Ventes brutes', fmt(s.gross_amount))
  row('Commission Skignas', `-${fmt(s.commission_amount)}`)
  row('Transactions', String(s.transaction_count))
  y += 6
  doc.moveTo(50, y).lineTo(545, y).strokeColor(C.border).stroke()
  y += 14

  // Pastille bleue pour le net, même traitement visuel que le total facture.
  doc.roundedRect(345, y - 6, 200, 28, 8).fill(C.blueBg)
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.blueDark)
    .text('Net perçu', 358, y + 2, { width: 100 })
    .text(fmt(s.net_amount), 460, y + 2, { width: 78, align: 'right' })
  y += 46

  /* ── Versement ── */
  doc.roundedRect(50, y, 495, s.payout_status === 'requested' ? 54 : 40, 10).fill(C.bgLight)
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.textFaint).text('VERSEMENT', 66, y + 10)
  doc.font('Helvetica').fontSize(10).fillColor(C.text)
    .text(PAYOUT_LABELS[s.payout_status] ?? s.payout_status, 66, y + 23, { width: 463 })
  if (s.payout_status === 'requested' && s.payout_operator && s.payout_phone) {
    const operatorLabel = s.payout_operator.replace(/_/g, ' ')
    const dateLabel = s.paid_out_at ? ` · ${new Date(s.paid_out_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}` : ''
    doc.font('Helvetica').fontSize(9).fillColor(C.textSub)
      .text(`${operatorLabel} · ${s.payout_phone}${dateLabel}`, 66, y + 38)
  }

  /* ── Pied de page ── */
  doc.font('Helvetica').fontSize(8).fillColor(C.textFaint)
    .text('Document généré automatiquement par Skignas — à usage comptable interne.', 50, 760, { width: 495, align: 'center' })

  return doc
}