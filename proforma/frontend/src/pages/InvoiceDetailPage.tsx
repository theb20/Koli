import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, Printer, Loader2 } from '../components/ui/Icon'
import { api, pdfUrl } from '../lib/api'
import { useUiStore } from '../store/uiStore'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Button } from '../components/ui/Button'
import { DocumentPreview } from '../components/invoice/DocumentPreview'
import { PaymentTracker } from '../components/invoice/PaymentTracker'
import type { Company, Invoice } from '../types'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PAID: 'Payée',
  PARTIALLY_PAID: 'Partiellement payée',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
}

interface FullInvoice extends Invoice {
  company: Company
}

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState<FullInvoice | null>(null)
  const pushToast = useUiStore((s) => s.pushToast)

  function load() {
    api.get<{ invoice: FullInvoice }>(`/api/invoices/${id}`).then((res) => setInvoice(res.invoice))
  }

  useEffect(load, [id])

  async function markDepositPaid() {
    try {
      await api.post(`/api/invoices/${id}/mark-deposit-paid`)
      pushToast('Acompte marqué reçu', 'success')
      load()
    } catch (err: any) {
      pushToast(err.message, 'error')
    }
  }

  async function markPaid() {
    try {
      await api.post(`/api/invoices/${id}/mark-paid`)
      pushToast('Facture marquée payée', 'success')
      load()
    } catch (err: any) {
      pushToast(err.message, 'error')
    }
  }

  if (!invoice) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={24} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/factures" className="p-1.5 text-muted hover:bg-gray-100">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold text-ink">{invoice.number}</h1>
            <StatusBadge status={invoice.status} kind="invoice" />
          </div>
          <p className="text-sm text-muted">{invoice.client?.name}</p>
        </div>
        <div className="no-print ml-auto flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>
            Imprimer
          </Button>
          <a href={pdfUrl('invoices', invoice.id)} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm" icon={<Download size={14} />}>
              PDF
            </Button>
          </a>
        </div>
      </div>

      {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
        <div className="no-print">
          <PaymentTracker
            deposit={invoice.deposit}
            balanceDue={invoice.balanceDue}
            total={invoice.total}
            currency={invoice.currency}
            paymentStatus={invoice.paymentStatus}
            depositPaidAt={invoice.depositPaidAt}
            paidAt={invoice.paidAt}
            paymentProvider={invoice.paymentProvider}
            onMarkDeposit={markDepositPaid}
            onMarkPaid={markPaid}
          />
        </div>
      )}

      <div className="overflow-x-auto bg-gray-100 p-6">
        <DocumentPreview
          docTitle="FACTURE"
          number={invoice.number}
          statusLabel={STATUS_LABEL[invoice.status] || invoice.status}
          issueDate={invoice.issueDate}
          expiryDate={invoice.dueDate}
          reference={invoice.reference}
          salesperson={invoice.salesperson}
          company={{
            name: invoice.company.name,
            address: invoice.company.address,
            phone: invoice.company.phone,
            email: invoice.company.email,
            website: invoice.company.website,
            taxId: invoice.company.taxId,
            rccm: invoice.company.rccm,
            logoUrl: invoice.company.logoUrl ? `${import.meta.env.VITE_API_BASE || 'http://localhost:4100'}${invoice.company.logoUrl}` : undefined,
          }}
          client={{
            name: invoice.client?.name || '',
            contactName: invoice.client?.contactName,
            address: invoice.client?.address,
            phone: invoice.client?.phone,
            email: invoice.client?.email,
          }}
          items={invoice.items.map((it) => ({
            reference: it.reference || undefined,
            name: it.name,
            description: it.description || undefined,
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: it.unitPrice,
            discountPercent: it.discountPercent,
            lineTotal: it.lineTotal || 0,
            taxRate: it.taxRate,
          }))}
          currency={invoice.currency}
          template={invoice.template}
          customization={invoice.customization}
          subtotal={invoice.subtotal}
          discountType={invoice.discountType}
          discountValue={invoice.discountValue}
          discountAmount={invoice.discountAmount}
          taxAmount={invoice.taxAmount}
          shippingFee={invoice.shippingFee}
          otherFees={invoice.otherFees}
          otherFeesLabel={invoice.otherFeesLabel}
          deposit={invoice.deposit}
          total={invoice.total}
          balanceDue={invoice.balanceDue}
          notes={invoice.notes}
          termsText={invoice.termsText}
          footerText={invoice.footerText}
        />
      </div>
    </div>
  )
}
