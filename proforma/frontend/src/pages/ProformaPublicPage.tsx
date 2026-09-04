import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Download, Phone, Mail, Loader2, ShieldCheck, CreditCard, PenLine, FlaskConical } from '../components/ui/Icon'
import { API_BASE } from '../lib/api'
import { DocumentPreview } from '../components/invoice/DocumentPreview'
import { SignaturePad } from '../components/invoice/SignaturePad'
import { DemoPaymentModal } from '../components/invoice/DemoPaymentModal'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Field'
import type { DocumentPreviewProps } from '../components/invoice/DocumentPreview'

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

export default function ProformaPublicPage() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const [doc, setDoc] = useState<DocumentPreviewProps | null>(null)
  const [status, setStatus] = useState('')
  const [paymentEnabled, setPaymentEnabled] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)
  const [paymentProvider, setPaymentProvider] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [acceptOpen, setAcceptOpen] = useState(false)
  const [confirmRefuse, setConfirmRefuse] = useState(false)
  const [demoPayOpen, setDemoPayOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [payLoading, setPayLoading] = useState(false)

  async function load() {
    try {
      const res = await fetch(`${API_BASE}/api/public/proformas/${token}`)
      if (!res.ok) return setNotFound(true)
      const data = await res.json()
      setDoc({
        docTitle: 'FACTURE PROFORMA',
        number: data.proforma.number,
        statusLabel: STATUS_LABEL[data.status] || data.status,
        issueDate: data.proforma.issueDate,
        expiryDate: data.proforma.expiryDate,
        reference: data.proforma.reference,
        salesperson: data.proforma.salesperson,
        company: data.proforma.company,
        client: data.proforma.client,
        items: data.proforma.items,
        currency: data.proforma.currency,
        template: data.proforma.template,
        customization: data.proforma.customization,
        subtotal: data.proforma.subtotal,
        discountType: data.proforma.discountType,
        discountValue: data.proforma.discountValue,
        discountAmount: data.proforma.discountAmount,
        taxAmount: data.proforma.taxAmount,
        shippingFee: data.proforma.shippingFee,
        otherFees: data.proforma.otherFees,
        otherFeesLabel: data.proforma.otherFeesLabel,
        deposit: data.proforma.deposit,
        total: data.proforma.total,
        balanceDue: data.proforma.balanceDue,
        notes: data.proforma.notes,
        termsText: data.proforma.termsText,
        footerText: data.proforma.footerText,
      })
      setStatus(data.status)
      setPaymentEnabled(Boolean(data.paymentEnabled))
      setPaymentStatus(data.paymentStatus)
      setPaymentProvider(data.paymentProvider)
    } catch {
      setNotFound(true)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Retour depuis CinetPay (return_url) : on revérifie le statut réel côté serveur
  useEffect(() => {
    if (searchParams.get('payment') === 'return') {
      const t = setTimeout(load, 1500)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submitAccept(e: React.FormEvent) {
    e.preventDefault()
    if (!signerName.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/public/proformas/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signerName, signatureDataUrl }),
      })
      const data = await res.json()
      setStatus(data.status)
      setAcceptOpen(false)

      // Dès la signature confirmée, on enchaîne directement sur le paiement
      // plutôt que de forcer un second clic séparé.
      if (data.status === 'ACCEPTED' && paymentStatus !== 'paid') {
        if (paymentEnabled) {
          payOnline()
        } else {
          setDemoPayOpen(true)
        }
      }
    } finally {
      setBusy(false)
    }
  }

  async function refuse() {
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/public/proformas/${token}/refuse`, { method: 'POST' })
      const data = await res.json()
      setStatus(data.status)
    } finally {
      setBusy(false)
      setConfirmRefuse(false)
    }
  }

  async function payOnline() {
    setPayLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/public/proformas/${token}/payment-link`, { method: 'POST' })
      const data = await res.json()
      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        alert(data.message || 'Paiement indisponible')
      }
    } finally {
      setPayLoading(false)
    }
  }

  async function completeDemoPayment(method: string) {
    const res = await fetch(`${API_BASE}/api/public/proformas/${token}/payment-demo/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method }),
    })
    const data = await res.json()
    if (data.success) {
      setPaymentStatus('paid')
      setPaymentProvider(`demo-${method}`)
    }
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base text-center">
        <p className="text-sm text-muted">Ce document n'existe pas ou n'est plus disponible.</p>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <Loader2 className="animate-spin text-brand" size={24} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-border bg-white px-5 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <ShieldCheck size={18} className="text-brand" />
          <div>
            <p className="text-sm font-bold text-ink">{doc.company.name}</p>
            <p className="text-xs text-muted">vous a envoyé une facture proforma sécurisée</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-5 flex flex-wrap items-center gap-3 border border-border bg-white p-4">
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">{doc.number}</p>
            <p className="text-xs text-muted">Statut actuel : {STATUS_LABEL[status] || status}</p>
          </div>
          <a href={`${API_BASE}/api/public/proformas/${token}/pdf`} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm" icon={<Download size={14} />}>
              Télécharger le PDF
            </Button>
          </a>
          {doc.company.phone && (
            <a href={`tel:${doc.company.phone}`}>
              <Button variant="secondary" size="sm" icon={<Phone size={14} />}>
                Contacter
              </Button>
            </a>
          )}
          {doc.company.email && (
            <a href={`mailto:${doc.company.email}`}>
              <Button variant="ghost" size="sm" icon={<Mail size={14} />} />
            </a>
          )}
        </div>

        {(status === 'SENT' || status === 'VIEWED' || status === 'PENDING') && (
          <div className="mb-5 flex flex-wrap gap-3 border border-border bg-white p-4">
            <Button icon={<PenLine size={15} />} onClick={() => setAcceptOpen(true)}>
              Accepter la proforma
            </Button>
            <Button variant="danger" icon={<XCircle size={15} />} onClick={() => setConfirmRefuse(true)}>
              Refuser la proforma
            </Button>
          </div>
        )}

        {status === 'ACCEPTED' && (
          <div className="mb-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={16} /> Vous avez accepté cette proforma.
            </div>
            {paymentEnabled && paymentStatus !== 'paid' && (
              <div className="flex flex-wrap items-center gap-3 border border-border bg-white p-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">Payer maintenant</p>
                  <p className="text-xs text-muted">Wave, Orange Money, MTN, carte bancaire — via CinetPay</p>
                </div>
                <Button icon={<CreditCard size={15} />} loading={payLoading} onClick={payOnline}>
                  Payer en ligne
                </Button>
              </div>
            )}

            {!paymentEnabled && paymentStatus !== 'paid' && (
              <div className="flex flex-wrap items-center gap-3 border border-dashed border-amber-300 bg-amber-50 p-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">Payer en ligne (démonstration)</p>
                  <p className="text-xs text-amber-700">
                    {doc.company.name} n'a pas encore activé le paiement en ligne réel. Vous pouvez essayer le parcours de paiement en mode démo.
                  </p>
                </div>
                <Button icon={<FlaskConical size={15} />} onClick={() => setDemoPayOpen(true)}>
                  Payer en ligne (démo)
                </Button>
              </div>
            )}

            {paymentStatus === 'paid' && (
              <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={16} />
                {paymentProvider?.startsWith('demo-') ? 'Paiement simulé reçu (démo) — merci !' : 'Paiement reçu — merci !'}
              </div>
            )}
          </div>
        )}

        {status === 'REFUSED' && (
          <div className="mb-5 flex items-center gap-2 border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <XCircle size={16} /> Vous avez refusé cette proforma.
          </div>
        )}

        <div className="overflow-x-auto bg-white p-4 shadow-sm">
          <DocumentPreview {...doc} />
        </div>
      </div>

      <Modal open={acceptOpen} onClose={() => setAcceptOpen(false)} title="Accepter la proforma">
        <form onSubmit={submitAccept} className="flex flex-col gap-3">
          <p className="text-xs text-muted">
            En acceptant, vous confirmez votre accord sur les termes de cette facture proforma. Cette action est enregistrée avec votre nom et l'horodatage.
          </p>
          <Input label="Votre nom complet" required value={signerName} onChange={(e) => setSignerName(e.target.value)} />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink">Signature (optionnel)</span>
            <SignaturePad onChange={setSignatureDataUrl} />
          </label>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAcceptOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={busy} icon={<CheckCircle2 size={15} />}>
              Confirmer l'acceptation
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmRefuse}
        title="Refuser la proforma"
        message="Confirmez-vous le refus de cette facture proforma ?"
        confirmLabel="Refuser"
        danger
        loading={busy}
        onConfirm={refuse}
        onCancel={() => setConfirmRefuse(false)}
      />

      <DemoPaymentModal
        open={demoPayOpen}
        onClose={() => setDemoPayOpen(false)}
        amount={doc.balanceDue > 0 ? doc.balanceDue : doc.total}
        currency={doc.currency}
        onConfirm={completeDemoPayment}
      />
    </div>
  )
}
