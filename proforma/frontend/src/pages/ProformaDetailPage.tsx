import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Download, Printer, Share2, Send, Copy, ArrowRightLeft, Trash2, Pencil, Loader2, ArrowLeft, Clock } from '../components/ui/Icon'
import { api, pdfUrl } from '../lib/api'
import { useUiStore } from '../store/uiStore'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ShareModal } from '../components/invoice/ShareModal'
import { DocumentPreview } from '../components/invoice/DocumentPreview'
import { PaymentTracker } from '../components/invoice/PaymentTracker'
import type { Company, Proforma } from '../types'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING: 'En attente',
  SENT: 'Envoyée',
  VIEWED: 'Consultée',
  ACCEPTED: 'Acceptée',
  REFUSED: 'Refusée',
  EXPIRED: 'Expirée',
  CONVERTED: 'Convertie',
}

interface FullProforma extends Proforma {
  company: Company
}

export default function ProformaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)

  const [proforma, setProforma] = useState<FullProforma | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await api.get<{ proforma: FullProforma }>(`/api/proformas/${id}`)
    setProforma(res.proforma)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!proforma) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={24} />
      </div>
    )
  }

  async function handleSend() {
    setBusy(true)
    try {
      await api.post(`/api/proformas/${id}/send`)
      pushToast('Proforma envoyée par email', 'success')
      load()
    } catch (err: any) {
      pushToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleDuplicate() {
    const res = await api.post<{ proforma: Proforma }>(`/api/proformas/${id}/duplicate`)
    pushToast(`Dupliquée sous ${res.proforma.number}`, 'success')
    navigate(`/proformas/${res.proforma.id}/modifier`)
  }

  async function handleConvert() {
    setBusy(true)
    try {
      const res = await api.post<{
        invoice: { id: string; number: string }
        lowStockAlerts: { productId: string; name: string; stockQuantity: number }[]
      }>(`/api/proformas/${id}/convert`)
      pushToast(`Convertie en facture ${res.invoice.number}`, 'success')
      for (const alert of res.lowStockAlerts) {
        pushToast(`Stock faible : ${alert.name} (${alert.stockQuantity} restant(s))`, 'error')
      }
      navigate(`/factures/${res.invoice.id}`)
    } catch (err: any) {
      pushToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    await api.delete(`/api/proformas/${id}`)
    pushToast('Proforma supprimée', 'success')
    navigate('/proformas')
  }

  async function markDepositPaid() {
    try {
      await api.post(`/api/proformas/${id}/mark-deposit-paid`)
      pushToast('Acompte marqué reçu', 'success')
      load()
    } catch (err: any) {
      pushToast(err.message, 'error')
    }
  }

  async function markPaid() {
    try {
      await api.post(`/api/proformas/${id}/mark-paid`)
      pushToast('Proforma marquée payée', 'success')
      load()
    } catch (err: any) {
      pushToast(err.message, 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/proformas" className="p-1.5 text-muted hover:bg-gray-100">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold text-ink">{proforma.number}</h1>
            <StatusBadge status={proforma.status} />
            {proforma.paymentStatus === 'paid' && (
              <span className={` px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${proforma.paymentProvider?.startsWith('demo-') ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {proforma.paymentProvider?.startsWith('demo-') ? 'Payée (démo)' : 'Payée'}
              </span>
            )}
            {proforma.paymentStatus === 'deposit_paid' && (
              <span className="bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">Acompte reçu</span>
            )}
          </div>
          <p className="text-sm text-muted">{proforma.client?.name}</p>
        </div>
        <div className="no-print ml-auto flex flex-wrap items-center gap-2">
          {proforma.status !== 'CONVERTED' && (
            <Button variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => navigate(`/proformas/${id}/modifier`)}>
              Modifier
            </Button>
          )}
          <Button variant="secondary" size="sm" icon={<Copy size={14} />} onClick={handleDuplicate}>
            Dupliquer
          </Button>
          <Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>
            Imprimer
          </Button>
          <a href={pdfUrl('proformas', proforma.id)} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm" icon={<Download size={14} />}>
              PDF
            </Button>
          </a>
          <Button variant="secondary" size="sm" icon={<Share2 size={14} />} onClick={() => setShareOpen(true)}>
            Partager
          </Button>
          <Button size="sm" icon={<Send size={14} />} loading={busy} disabled={!proforma.client?.email} onClick={handleSend}>
            Envoyer
          </Button>
          {proforma.status === 'ACCEPTED' && (
            <Button size="sm" icon={<ArrowRightLeft size={14} />} loading={busy} onClick={handleConvert}>
              Convertir en facture
            </Button>
          )}
          <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setConfirmDelete(true)}>
            Supprimer
          </Button>
        </div>
      </div>

      {proforma.status !== 'CONVERTED' && proforma.status !== 'REFUSED' && (
        <div className="no-print">
          <PaymentTracker
            deposit={proforma.deposit}
            balanceDue={proforma.balanceDue}
            total={proforma.total}
            currency={proforma.currency}
            paymentStatus={proforma.paymentStatus}
            depositPaidAt={proforma.depositPaidAt}
            paidAt={proforma.paidAt}
            paymentProvider={proforma.paymentProvider}
            onMarkDeposit={markDepositPaid}
            onMarkPaid={markPaid}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="overflow-x-auto bg-gray-100 p-6">
          <DocumentPreview
            docTitle="FACTURE PROFORMA"
            number={proforma.number}
            statusLabel={STATUS_LABEL[proforma.status] || proforma.status}
            issueDate={proforma.issueDate}
            expiryDate={proforma.expiryDate}
            reference={proforma.reference}
            salesperson={proforma.salesperson}
            company={{
              name: proforma.company.name,
              address: proforma.company.address,
              phone: proforma.company.phone,
              email: proforma.company.email,
              website: proforma.company.website,
              taxId: proforma.company.taxId,
              rccm: proforma.company.rccm,
              logoUrl: proforma.company.logoUrl ? `${import.meta.env.VITE_API_BASE || 'http://localhost:4100'}${proforma.company.logoUrl}` : undefined,
            }}
            client={{
              name: proforma.client?.name || '',
              contactName: proforma.client?.contactName,
              address: proforma.client?.address,
              phone: proforma.client?.phone,
              email: proforma.client?.email,
            }}
            items={proforma.items.map((it) => ({
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
            currency={proforma.currency}
            template={proforma.template}
            customization={proforma.customization}
            subtotal={proforma.subtotal}
            discountType={proforma.discountType}
            discountValue={proforma.discountValue}
            discountAmount={proforma.discountAmount}
            taxAmount={proforma.taxAmount}
            shippingFee={proforma.shippingFee}
            otherFees={proforma.otherFees}
            otherFeesLabel={proforma.otherFeesLabel}
            deposit={proforma.deposit}
            total={proforma.total}
            balanceDue={proforma.balanceDue}
            notes={proforma.notes}
            termsText={proforma.termsText}
            footerText={proforma.footerText}
          />
        </div>

        <div className="no-print border border-border bg-white p-5">
          <p className="mb-3 text-sm font-bold text-ink">Historique</p>
          <div className="flex flex-col gap-3">
            {(proforma.activity || []).map((a) => (
              <div key={a.id} className="flex gap-2.5 text-xs">
                <Clock size={13} className="mt-0.5 shrink-0 text-muted" />
                <div>
                  <p className="text-ink">{a.action}</p>
                  <p className="text-muted">{new Date(a.createdAt).toLocaleString('fr-FR')}</p>
                </div>
              </div>
            ))}
            {(!proforma.activity || proforma.activity.length === 0) && <p className="text-xs text-muted">Aucun événement.</p>}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer la proforma"
        message={`Supprimer définitivement ${proforma.number} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} publicToken={proforma.publicToken} number={proforma.number} id={proforma.id} />
    </div>
  )
}
