import { formatMoney } from '../../lib/money'
import { TEMPLATE_FONT, TEMPLATE_WEIGHT } from '../../lib/templates'
import type { Currency, Customization, TemplateName } from '../../types'

export interface PreviewItem {
  reference?: string
  name: string
  description?: string
  quantity: number
  unit: string
  unitPrice: number // centimes
  discountPercent: number
  lineTotal: number
  taxRate: number
}

export interface PreviewParty {
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  taxId?: string | null
  rccm?: string | null
  logoUrl?: string | null
  contactName?: string | null
  country?: string | null
}

export interface DocumentPreviewProps {
  docTitle: string
  number: string
  statusLabel: string
  issueDate?: string
  expiryDate?: string | null
  reference?: string | null
  salesperson?: string | null
  company: PreviewParty
  client: PreviewParty
  items: PreviewItem[]
  currency: Currency
  template: TemplateName
  customization?: Customization | null
  subtotal: number
  discountType: 'percent' | 'amount'
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

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function DocumentPreview(p: DocumentPreviewProps) {
  const c = p.customization || {}
  const primary = c.primaryColor || '#0a5c36'
  const secondary = c.secondaryColor || '#111827'
  const textColor = c.textColor || '#1f2933'
  const borderColor = c.borderColor || '#e5e7eb'
  const font = c.fontFamily || TEMPLATE_FONT[p.template]
  const weight = TEMPLATE_WEIGHT[p.template]
  const radius = p.template === 'modern' ? 10 : p.template === 'classic' || p.template === 'corporate' ? 3 : 0

  const money = (m: number) => formatMoney(m, p.currency)

  return (
    <div
      className="mx-auto flex w-full max-w-[794px] flex-col bg-white p-10 text-[11px] shadow-sm"
      style={{ color: textColor, fontFamily: "'Inter', system-ui, sans-serif", aspectRatio: '210 / 297', minHeight: 1000 }}
    >
      <div className="flex items-start justify-between">
        <div>
          {p.company.logoUrl && <img src={p.company.logoUrl} alt="" className="mb-2 max-h-14 max-w-[200px] object-contain" />}
          <p style={{ fontFamily: font, fontWeight: weight, color: secondary }} className="text-base">
            {p.company.name}
          </p>
          <div className="mt-1 text-[10px] leading-relaxed text-gray-500">
            {p.company.address && <p>{p.company.address}</p>}
            <p>{[p.company.phone, p.company.email].filter(Boolean).join(' · ')}</p>
            {p.company.website && <p>{p.company.website}</p>}
            {(p.company.taxId || p.company.rccm) && (
              <p>
                {p.company.taxId && `NIF: ${p.company.taxId} `}
                {p.company.rccm && `RCCM: ${p.company.rccm}`}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p style={{ fontFamily: font, fontWeight: weight, color: primary, letterSpacing: '0.04em' }} className="text-xl">
            {p.docTitle}
          </p>
          <p className="mt-1.5 text-sm font-bold" style={{ color: secondary }}>
            {p.number}
          </p>
          <span
            className="mt-1.5 inline-block rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide"
            style={{ background: `${primary}1a`, color: primary }}
          >
            {p.statusLabel}
          </span>
        </div>
      </div>

      <div className="mt-6 flex gap-5">
        <div className="flex-1 rounded p-3" style={{ border: `1px solid ${borderColor}`, borderRadius: radius }}>
          <p className="mb-2 text-[9px] font-bold uppercase tracking-wide text-gray-400">Facturé à</p>
          <p className="font-bold" style={{ color: secondary }}>
            {p.client.name || 'Sélectionnez un client'}
          </p>
          {p.client.contactName && <p>{p.client.contactName}</p>}
          {p.client.address && <p>{p.client.address}</p>}
          <p>{[p.client.phone, p.client.email].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex-1 rounded p-3" style={{ border: `1px solid ${borderColor}`, borderRadius: radius }}>
          <p className="mb-2 text-[9px] font-bold uppercase tracking-wide text-gray-400">Détails du document</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px]">
            <InfoBlock label="Date d'émission" value={fmtDate(p.issueDate)} />
            {p.expiryDate && <InfoBlock label="Valable jusqu'au" value={fmtDate(p.expiryDate)} />}
            {p.reference && <InfoBlock label="Référence" value={p.reference} />}
            {p.salesperson && <InfoBlock label="Commercial" value={p.salesperson} />}
          </div>
        </div>
      </div>

      <table className="mt-5 w-full border-collapse text-[10px]">
        <thead>
          <tr style={{ background: secondary, color: '#fff' }}>
            <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide">Réf.</th>
            <th className="px-2 py-2 text-left font-semibold uppercase tracking-wide">Désignation</th>
            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wide">Qté</th>
            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wide">P.U.</th>
            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wide">Remise</th>
            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wide">Taxe</th>
            <th className="px-2 py-2 text-right font-semibold uppercase tracking-wide">Total</th>
          </tr>
        </thead>
        <tbody>
          {p.items.length === 0 && (
            <tr>
              <td colSpan={7} className="px-2 py-6 text-center text-gray-400">
                Ajoutez des produits ou services
              </td>
            </tr>
          )}
          {p.items.map((it, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${borderColor}` }}>
              <td className="px-2 py-2 align-top text-gray-500">{it.reference || '—'}</td>
              <td className="px-2 py-2 align-top">
                <p className="font-semibold" style={{ color: secondary }}>
                  {it.name || 'Nouvelle ligne'}
                </p>
                {it.description && <p className="text-gray-500">{it.description}</p>}
              </td>
              <td className="px-2 py-2 text-right align-top tabular-nums">
                {it.quantity} {it.unit}
              </td>
              <td className="px-2 py-2 text-right align-top tabular-nums">{money(it.unitPrice)}</td>
              <td className="px-2 py-2 text-right align-top tabular-nums">{it.discountPercent ? `${it.discountPercent}%` : '—'}</td>
              <td className="px-2 py-2 text-right align-top tabular-nums">{it.taxRate ? `${it.taxRate}%` : '—'}</td>
              <td className="px-2 py-2 text-right align-top font-semibold tabular-nums" style={{ color: secondary }}>
                {money(it.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-64 text-[10.5px]">
          <Row label="Sous-total HT" value={money(p.subtotal)} />
          {p.discountAmount > 0 && (
            <Row label={`Remise${p.discountType === 'percent' ? ` (${p.discountValue}%)` : ''}`} value={`- ${money(p.discountAmount)}`} />
          )}
          <Row label="Taxes" value={money(p.taxAmount)} />
          {p.shippingFee > 0 && <Row label="Livraison" value={money(p.shippingFee)} />}
          {p.otherFees > 0 && <Row label={p.otherFeesLabel || 'Frais divers'} value={money(p.otherFees)} />}
          <div className="mt-1.5 flex justify-between border-t-2 pt-2 text-sm font-bold" style={{ borderColor: secondary, color: primary }}>
            <span>Total TTC</span>
            <span className="tabular-nums">{money(p.total)}</span>
          </div>
          {p.deposit > 0 && (
            <>
              <Row label="Acompte versé" value={`- ${money(p.deposit)}`} />
              <div className="flex justify-between pt-1 text-xs font-bold" style={{ color: secondary }}>
                <span>Solde restant dû</span>
                <span className="tabular-nums">{money(p.balanceDue)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {(p.termsText || p.notes) && (
        <div className="mt-5 flex gap-5 text-[10px]">
          {p.termsText && (
            <div className="flex-1">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-gray-400">Conditions de paiement</p>
              <p className="whitespace-pre-wrap text-gray-600">{p.termsText}</p>
            </div>
          )}
          {p.notes && (
            <div className="flex-1">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-gray-400">Notes</p>
              <p className="whitespace-pre-wrap text-gray-600">{p.notes}</p>
            </div>
          )}
        </div>
      )}

      {(p.signatureUrl || p.stampUrl) && (
        <div className="mt-8 flex justify-between text-[9px] text-gray-400">
          <div className="w-36 text-center">
            {p.signatureUrl && <img src={p.signatureUrl} className="mx-auto mb-1 max-h-14 max-w-[140px] object-contain" />}
            <div className="border-t pt-1" style={{ borderColor }}>
              Signature
            </div>
          </div>
          <div className="w-36 text-center">
            {p.stampUrl && <img src={p.stampUrl} className="mx-auto mb-1 max-h-14 max-w-[140px] object-contain" />}
            <div className="border-t pt-1" style={{ borderColor }}>
              Cachet
            </div>
          </div>
        </div>
      )}

      {p.footerText && (
        <div className="mt-auto pt-6 text-center text-[9px] text-gray-400" style={{ borderTop: `1px solid ${borderColor}`, marginTop: 24 }}>
          {p.footerText}
        </div>
      )}
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wide text-gray-400">{label}</p>
      <p>{value}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-gray-500">
      <span>{label}</span>
      <span className="tabular-nums text-ink">{value}</span>
    </div>
  )
}
