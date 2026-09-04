import { formatMoney, type Currency } from '../lib/money.js'

export type DocKind = 'proforma' | 'invoice'

export interface DocItemView {
  reference?: string | null
  name: string
  description?: string | null
  quantity: number
  unit: string
  unitPrice: number
  discountPercent: number
  lineTotal: number
  taxRate: number
}

export interface DocumentView {
  kind: DocKind
  number: string
  status: string
  issueDate: string
  expiryDate?: string | null
  reference?: string | null
  object?: string | null
  salesperson?: string | null
  paymentTermLabel?: string | null
  deliveryDelay?: string | null
  currency: Currency
  template: string
  customization?: Record<string, any> | null

  company: {
    name: string
    address?: string | null
    phone?: string | null
    email?: string | null
    website?: string | null
    taxId?: string | null
    rccm?: string | null
    logoUrl?: string | null
  }
  client: {
    name: string
    contactName?: string | null
    address?: string | null
    phone?: string | null
    email?: string | null
    country?: string | null
    taxId?: string | null
  }

  items: DocItemView[]
  subtotal: number
  discountType: string
  discountValue: number
  discountAmount: number
  taxAmount: number
  shippingFee: number
  otherFees: number
  otherFeesLabel?: string | null
  deposit: number
  total: number
  balanceDue: number

  notes?: string | null
  termsText?: string | null
  footerText?: string | null
  signatureUrl?: string | null
  stampUrl?: string | null
}

const TEMPLATE_TOKENS: Record<string, { fontHeading: string; radius: string; accentWeight: string }> = {
  classic: { fontHeading: "'Georgia', serif", radius: '4px', accentWeight: '700' },
  modern: { fontHeading: "'Helvetica Neue', Arial, sans-serif", radius: '10px', accentWeight: '800' },
  minimal: { fontHeading: "'Helvetica Neue', Arial, sans-serif", radius: '0px', accentWeight: '500' },
  corporate: { fontHeading: "'Georgia', serif", radius: '2px', accentWeight: '700' },
  elegant: { fontHeading: "'Didot', 'Georgia', serif", radius: '0px', accentWeight: '600' },
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING: 'En attente',
  SENT: 'Envoyée',
  VIEWED: 'Consultée',
  ACCEPTED: 'Acceptée',
  REFUSED: 'Refusée',
  EXPIRED: 'Expirée',
  CONVERTED: 'Convertie',
  PAID: 'Payée',
  PARTIALLY_PAID: 'Partiellement payée',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
}

function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function renderDocumentHtml(doc: DocumentView): string {
  const tokens = TEMPLATE_TOKENS[doc.template] || TEMPLATE_TOKENS.classic
  const custom = doc.customization || {}
  const primary = custom.primaryColor || '#0a5c36'
  const secondary = custom.secondaryColor || '#111827'
  const textColor = custom.textColor || '#1f2933'
  const borderColor = custom.borderColor || '#e5e7eb'
  const fontBody = custom.fontFamily || "'Helvetica Neue', Arial, sans-serif"

  const money = (minor: number) => esc(formatMoney(minor, doc.currency))

  const rows = doc.items
    .map(
      (it) => `
      <tr>
        <td class="ref">${esc(it.reference || '—')}</td>
        <td class="desig">
          <div class="name">${esc(it.name)}</div>
          ${it.description ? `<div class="desc">${esc(it.description)}</div>` : ''}
        </td>
        <td class="num">${it.quantity} ${esc(it.unit)}</td>
        <td class="num">${money(it.unitPrice)}</td>
        <td class="num">${it.discountPercent ? esc(it.discountPercent) + ' %' : '—'}</td>
        <td class="num">${it.taxRate ? esc(it.taxRate) + ' %' : '—'}</td>
        <td class="num total">${money(it.lineTotal)}</td>
      </tr>`
    )
    .join('')

  const docTitle = doc.kind === 'proforma' ? 'FACTURE PROFORMA' : 'FACTURE'

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: ${fontBody};
    color: ${textColor};
    font-size: 11px;
    line-height: 1.5;
    margin: 0;
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
  .logo img { max-height: 64px; max-width: 220px; object-fit: contain; }
  .company-name { font-family: ${tokens.fontHeading}; font-weight: ${tokens.accentWeight}; font-size: 16px; color: ${secondary}; margin: 6px 0 2px; }
  .company-meta { color: #6b7280; font-size: 10px; line-height: 1.6; }
  .doc-meta { text-align: right; }
  .doc-title { font-family: ${tokens.fontHeading}; font-size: 20px; font-weight: ${tokens.accentWeight}; color: ${primary}; letter-spacing: 0.04em; margin-bottom: 6px; }
  .doc-number { font-size: 13px; font-weight: 700; color: ${secondary}; }
  .status-badge { display: inline-block; margin-top: 6px; padding: 3px 10px; border-radius: 999px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: ${primary}1a; color: ${primary}; }
  .parties { display: flex; gap: 24px; margin-bottom: 24px; }
  .party { flex: 1; border: 1px solid ${borderColor}; border-radius: ${tokens.radius}; padding: 12px 14px; }
  .party h4 { margin: 0 0 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; }
  .party .name { font-weight: 700; color: ${secondary}; margin-bottom: 3px; }
  .doc-info { display: flex; gap: 20px; margin-bottom: 20px; font-size: 10px; flex-wrap: wrap; }
  .doc-info div span { display: block; color: #9ca3af; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  table.items thead th {
    background: ${secondary}; color: #fff; font-size: 9px; text-transform: uppercase;
    letter-spacing: 0.04em; text-align: left; padding: 8px 8px; border-radius: 0;
  }
  table.items thead th.num { text-align: right; }
  table.items tbody td { padding: 8px; border-bottom: 1px solid ${borderColor}; vertical-align: top; }
  table.items tbody td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  table.items tbody td.total { font-weight: 700; color: ${secondary}; }
  .desig .name { font-weight: 600; color: ${secondary}; }
  .desig .desc { color: #6b7280; font-size: 9.5px; margin-top: 2px; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 24px; }
  .totals table { width: 260px; border-collapse: collapse; }
  .totals td { padding: 5px 0; font-size: 10.5px; }
  .totals td.label { color: #6b7280; }
  .totals td.val { text-align: right; font-variant-numeric: tabular-nums; }
  .totals tr.grand td { border-top: 2px solid ${secondary}; padding-top: 8px; font-size: 13px; font-weight: 700; color: ${primary}; }
  .totals tr.balance td { font-weight: 700; color: ${secondary}; }
  .notes-grid { display: flex; gap: 20px; margin-bottom: 20px; }
  .notes-grid .block { flex: 1; }
  .notes-grid h4 { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; margin: 0 0 6px; }
  .notes-grid p { margin: 0; font-size: 10px; color: ${textColor}; white-space: pre-wrap; }
  .signatures { display: flex; justify-content: space-between; margin-top: 30px; }
  .sig-block { text-align: center; width: 160px; }
  .sig-block img { max-height: 60px; max-width: 150px; object-fit: contain; margin-bottom: 4px; }
  .sig-line { border-top: 1px solid ${borderColor}; padding-top: 4px; font-size: 9px; color: #9ca3af; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid ${borderColor}; text-align: center; font-size: 9px; color: #9ca3af; white-space: pre-wrap; }
</style>
</head>
<body>
  <div class="header">
    <div>
      ${doc.company.logoUrl ? `<div class="logo"><img src="${esc(doc.company.logoUrl)}" /></div>` : ''}
      <div class="company-name">${esc(doc.company.name)}</div>
      <div class="company-meta">
        ${doc.company.address ? esc(doc.company.address) + '<br/>' : ''}
        ${[doc.company.phone, doc.company.email].filter(Boolean).map(esc).join(' · ')}<br/>
        ${doc.company.website ? esc(doc.company.website) + '<br/>' : ''}
        ${doc.company.taxId ? 'NIF: ' + esc(doc.company.taxId) + ' ' : ''}${doc.company.rccm ? 'RCCM: ' + esc(doc.company.rccm) : ''}
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-title">${docTitle}</div>
      <div class="doc-number">${esc(doc.number)}</div>
      <div class="status-badge">${esc(STATUS_LABEL[doc.status] || doc.status)}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h4>Facturé à</h4>
      <div class="name">${esc(doc.client.name)}</div>
      ${doc.client.contactName ? `<div>${esc(doc.client.contactName)}</div>` : ''}
      ${doc.client.address ? `<div>${esc(doc.client.address)}</div>` : ''}
      ${[doc.client.phone, doc.client.email].filter(Boolean).map((v) => `<div>${esc(v)}</div>`).join('')}
      ${doc.client.taxId ? `<div>NIF: ${esc(doc.client.taxId)}</div>` : ''}
    </div>
    <div class="party">
      <h4>Détails du document</h4>
      <div class="doc-info">
        <div><span>Date d'émission</span>${fmtDate(doc.issueDate)}</div>
        ${doc.expiryDate ? `<div><span>Valable jusqu'au</span>${fmtDate(doc.expiryDate)}</div>` : ''}
        ${doc.reference ? `<div><span>Référence</span>${esc(doc.reference)}</div>` : ''}
        ${doc.salesperson ? `<div><span>Commercial</span>${esc(doc.salesperson)}</div>` : ''}
      </div>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th>Réf.</th>
        <th>Désignation</th>
        <th class="num">Qté</th>
        <th class="num">P.U.</th>
        <th class="num">Remise</th>
        <th class="num">Taxe</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td class="label">Sous-total HT</td><td class="val">${money(doc.subtotal)}</td></tr>
      ${doc.discountAmount ? `<tr><td class="label">Remise${doc.discountType === 'percent' ? ' (' + doc.discountValue + '%)' : ''}</td><td class="val">- ${money(doc.discountAmount)}</td></tr>` : ''}
      <tr><td class="label">Taxes</td><td class="val">${money(doc.taxAmount)}</td></tr>
      ${doc.shippingFee ? `<tr><td class="label">Livraison</td><td class="val">${money(doc.shippingFee)}</td></tr>` : ''}
      ${doc.otherFees ? `<tr><td class="label">${esc(doc.otherFeesLabel || 'Frais divers')}</td><td class="val">${money(doc.otherFees)}</td></tr>` : ''}
      <tr class="grand"><td>Total TTC</td><td class="val">${money(doc.total)}</td></tr>
      ${doc.deposit ? `<tr><td class="label">Acompte versé</td><td class="val">- ${money(doc.deposit)}</td></tr>
      <tr class="balance"><td>Solde restant dû</td><td class="val">${money(doc.balanceDue)}</td></tr>` : ''}
    </table>
  </div>

  ${
    doc.notes || doc.termsText
      ? `<div class="notes-grid">
        ${doc.termsText ? `<div class="block"><h4>Conditions de paiement</h4><p>${esc(doc.termsText)}</p></div>` : ''}
        ${doc.notes ? `<div class="block"><h4>Notes</h4><p>${esc(doc.notes)}</p></div>` : ''}
      </div>`
      : ''
  }

  ${
    doc.signatureUrl || doc.stampUrl
      ? `<div class="signatures">
        <div class="sig-block">${doc.signatureUrl ? `<img src="${esc(doc.signatureUrl)}"/>` : ''}<div class="sig-line">Signature</div></div>
        <div class="sig-block">${doc.stampUrl ? `<img src="${esc(doc.stampUrl)}"/>` : ''}<div class="sig-line">Cachet</div></div>
      </div>`
      : ''
  }

  ${doc.footerText ? `<div class="footer">${esc(doc.footerText)}</div>` : ''}
</body>
</html>`
}
