import type { InvoiceStatus, ProformaStatus } from '../../types'

const PROFORMA_STYLES: Record<ProformaStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-amber-50 text-amber-700',
  SENT: 'bg-blue-50 text-blue-700',
  VIEWED: 'bg-violet-50 text-violet-700',
  ACCEPTED: 'bg-emerald-50 text-emerald-700',
  REFUSED: 'bg-red-50 text-red-700',
  EXPIRED: 'bg-orange-50 text-orange-700',
  CONVERTED: 'bg-brand-light text-brand-dark',
}
const PROFORMA_LABELS: Record<ProformaStatus, string> = {
  DRAFT: 'Brouillon',
  PENDING: 'En attente',
  SENT: 'Envoyée',
  VIEWED: 'Consultée',
  ACCEPTED: 'Acceptée',
  REFUSED: 'Refusée',
  EXPIRED: 'Expirée',
  CONVERTED: 'Convertie',
}

const INVOICE_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-50 text-blue-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-700',
  OVERDUE: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-400',
}
const INVOICE_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PAID: 'Payée',
  PARTIALLY_PAID: 'Partiellement payée',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
}

export function StatusBadge({ status, kind = 'proforma' }: { status: string; kind?: 'proforma' | 'invoice' }) {
  const styles = kind === 'proforma' ? PROFORMA_STYLES[status as ProformaStatus] : INVOICE_STYLES[status as InvoiceStatus]
  const label = kind === 'proforma' ? PROFORMA_LABELS[status as ProformaStatus] : INVOICE_LABELS[status as InvoiceStatus]
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${styles || 'bg-gray-100 text-gray-600'}`}>
      {label || status}
    </span>
  )
}
