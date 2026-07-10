import PDFDocument from 'pdfkit'
import type { Order, OrderItem } from '@prisma/client'
import type { SiteSettings } from '@prisma/client'

const PAYMENT_LABELS: Record<string, string> = {
  orange: 'Orange Money',
  mtn:    'MTN Mobile Money',
  wave:   'Wave',
  cash:   'Paiement à la livraison',
}

const STATUS_LABELS: Record<string, string> = {
  pending:   'En attente',
  paid:      'Payée',
  failed:    'Échouée',
  refunded:  'Remboursée',
}

function fmt(n: number): string {
  // toLocaleString('fr-FR') insère un espace fine insécable (U+202F) comme séparateur
  // de milliers — la police par défaut de pdfkit ne le supporte pas et affiche un
  // glyphe de remplacement. On force un espace ASCII classique à la place.
  const digits = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return digits + ' FCFA'
}

type OrderWithItems = Order & { items: OrderItem[] }

/** Construit le PDF de facture pour une commande — le document reste à .end() par l'appelant. */
export function buildInvoicePdf(order: OrderWithItems, settings: SiteSettings): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 50 })

  let shippingAddr: { ville?: string; quartier?: string; adresse?: string } = {}
  try { shippingAddr = JSON.parse(order.shippingAddress) } catch { /* ignore */ }
  const addressLine = [shippingAddr.adresse, shippingAddr.quartier, shippingAddr.ville].filter(Boolean).join(', ')

  /* ── En-tête ── */
  doc.fontSize(22).fillColor('#000000ff').text('Skignas', 50, 50)
  doc.fontSize(9).fillColor('#6b7280')
    .text(settings.address, 50, 78)
    .text(`${settings.supportEmail} · ${settings.supportPhone}`, 50, 92)

  doc.fontSize(18).fillColor('#111827').text('FACTURE', 350, 50, { align: 'right' })
  doc.fontSize(10).fillColor('#374151')
    .text(`N° ${order.orderNumber}`, 350, 76, { align: 'right' })
    .text(new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }), 350, 90, { align: 'right' })

  doc.moveTo(50, 115).lineTo(545, 115).strokeColor('#e5e7eb').stroke()

  /* ── Client / livraison ── */
  doc.fontSize(9).fillColor('#9ca3af').text('FACTURÉ À', 50, 130)
  doc.fontSize(10).fillColor('#111827')
    .text(`${order.clientPrenom} ${order.clientNom}`, 50, 144)
    .fillColor('#374151')
    .text(order.clientEmail, 50, 158)
    .text(order.clientTelephone, 50, 172)

  doc.fontSize(9).fillColor('#9ca3af').text('LIVRAISON', 300, 130)
  doc.fontSize(10).fillColor('#374151')
    .text(addressLine || '—', 300, 144, { width: 245 })
    .text(order.deliveryMethod === 'express' ? 'Express · 24-72h' : 'Standard · 3-5 jours', 300, 172)

  /* ── Tableau des articles ── */
  let y = 210
  doc.fontSize(9).fillColor('#9ca3af')
    .text('ARTICLE', 50, y)
    .text('QTÉ', 340, y, { width: 40, align: 'right' })
    .text('PRIX UNIT.', 390, y, { width: 75, align: 'right' })
    .text('TOTAL', 470, y, { width: 75, align: 'right' })
  y += 16
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke()
  y += 10

  doc.fontSize(10).fillColor('#111827')
  for (const item of order.items) {
    const lineTotal = item.price * item.qty
    const nameHeight = doc.heightOfString(item.name, { width: 270 })
    doc.text(item.name, 50, y, { width: 270 })
    doc.fillColor('#6b7280')
      .text(String(item.qty), 340, y, { width: 40, align: 'right' })
      .text(fmt(item.price), 390, y, { width: 75, align: 'right' })
      .fillColor('#111827')
      .text(fmt(lineTotal), 470, y, { width: 75, align: 'right' })
    y += Math.max(nameHeight, 14) + 10
  }

  doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke()
  y += 14

  /* ── Totaux ── */
  const totalsRow = (label: string, value: string, opts: { bold?: boolean; color?: string } = {}) => {
    doc.fontSize(opts.bold ? 12 : 10)
      .fillColor(opts.color ?? (opts.bold ? '#111827' : '#6b7280'))
      .text(label, 350, y, { width: 115 })
      .text(value, 470, y, { width: 75, align: 'right' })
    y += opts.bold ? 20 : 16
  }

  totalsRow('Sous-total', fmt(order.subtotal))
  totalsRow('Livraison', fmt(order.shippingCost))
  if (order.promoDiscount > 0) totalsRow(`Promo${order.promoCode ? ` (${order.promoCode})` : ''}`, `-${fmt(order.promoDiscount)}`, { color: '#059669' })
  if (order.taxAmount > 0) totalsRow(`TVA (${order.taxRate.toFixed(0)}%)`, fmt(order.taxAmount))
  y += 4
  doc.moveTo(350, y).lineTo(545, y).strokeColor('#e5e7eb').stroke()
  y += 10
  totalsRow('Total', fmt(order.total), { bold: true })

  /* ── Paiement ── */
  y += 20
  doc.fontSize(9).fillColor('#9ca3af').text('PAIEMENT', 50, y)
  y += 14
  doc.fontSize(10).fillColor('#374151')
    .text(`${PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod} · ${STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}`, 50, y)

  /* ── Pied de page ── */
  doc.fontSize(8).fillColor('#9ca3af')
    .text('Merci pour votre confiance — Skignas, marketplace tech en Côte d\'Ivoire.', 50, 760, { width: 495, align: 'center' })

  return doc
}
