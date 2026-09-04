import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Download, Send, Eye, Pencil, Loader2, Check } from '../components/ui/Icon'
import { api, pdfUrl } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { computeDocumentTotals } from '../lib/calculations'
import { TEMPLATES } from '../lib/templates'
import { CURRENCIES, fromMinorUnits } from '../lib/money'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Field'
import { ClientPicker } from '../components/invoice/ClientPicker'
import { ItemsEditor, emptyItem, type EditorItem } from '../components/invoice/ItemsEditor'
import { DocumentPreview } from '../components/invoice/DocumentPreview'
import type { Client, Currency, Customization, DocumentSettings, PaymentTerm, Product, Proforma, Tax, TemplateName } from '../types'

interface FormState {
  clientId: string
  reference: string
  object: string
  salesperson: string
  issueDate: string
  expiryDate: string
  paymentTermId: string
  deliveryDelay: string
  currency: Currency
  template: TemplateName
  customization: Customization
  items: EditorItem[]
  discountType: 'percent' | 'amount'
  discountValue: number
  shippingFee: number
  otherFees: number
  otherFeesLabel: string
  deposit: number
  notes: string
  termsText: string
  footerText: string
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
}

export default function ProformaEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId)
  const companies = useAuthStore((s) => s.companies)
  const pushToast = useUiStore((s) => s.pushToast)
  const activeCompany = companies.find((c) => c.id === activeCompanyId)

  const [proformaId, setProformaId] = useState<string | undefined>(id)
  const [status, setStatus] = useState('DRAFT')
  const [number, setNumber] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [taxes, setTaxes] = useState<Tax[]>([])
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit')

  const [form, setForm] = useState<FormState>({
    clientId: '',
    reference: '',
    object: '',
    salesperson: '',
    issueDate: new Date().toISOString().slice(0, 10),
    expiryDate: '',
    paymentTermId: '',
    deliveryDelay: '',
    currency: 'XOF',
    template: 'classic',
    customization: {},
    items: [],
    discountType: 'percent',
    discountValue: 0,
    shippingFee: 0,
    otherFees: 0,
    otherFeesLabel: '',
    deposit: 0,
    notes: '',
    termsText: '',
    footerText: '',
  })

  const skipNextSave = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Chargement des données de référence ──────────────────────────────
  useEffect(() => {
    if (!activeCompanyId) return
    Promise.all([
      api.get<{ clients: Client[] }>(`/api/companies/${activeCompanyId}/clients`),
      api.get<{ products: Product[] }>(`/api/companies/${activeCompanyId}/products`),
      api.get<{ taxes: Tax[] }>(`/api/companies/${activeCompanyId}/taxes`),
      api.get<{ paymentTerms: PaymentTerm[] }>(`/api/companies/${activeCompanyId}/payment-terms`),
    ]).then(([c, p, t, pt]) => {
      setClients(c.clients)
      setProducts(p.products)
      setTaxes(t.taxes)
      setPaymentTerms(pt.paymentTerms)
    })
  }, [activeCompanyId])

  // ── Chargement de la proforma existante, ou pré-remplissage par défaut ──
  useEffect(() => {
    if (!activeCompanyId) return
    skipNextSave.current = true

    if (id) {
      api.get<{ proforma: Proforma }>(`/api/proformas/${id}`).then((res) => {
        const p = res.proforma
        setProformaId(p.id)
        setStatus(p.status)
        setNumber(p.number)
        setForm({
          clientId: p.clientId,
          reference: p.reference || '',
          object: p.object || '',
          salesperson: p.salesperson || '',
          issueDate: p.issueDate.slice(0, 10),
          expiryDate: p.expiryDate ? p.expiryDate.slice(0, 10) : '',
          paymentTermId: p.paymentTermId || '',
          deliveryDelay: p.deliveryDelay || '',
          currency: p.currency,
          template: p.template,
          customization: p.customization || {},
          items: p.items.map((it) => ({
            productId: it.productId,
            reference: it.reference || undefined,
            name: it.name,
            description: it.description || undefined,
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: fromMinorUnits(it.unitPrice, p.currency),
            discountPercent: it.discountPercent,
            taxId: it.taxId,
            taxRate: it.taxRate,
          })),
          discountType: p.discountType,
          discountValue: p.discountValue,
          shippingFee: fromMinorUnits(p.shippingFee, p.currency),
          otherFees: fromMinorUnits(p.otherFees, p.currency),
          otherFeesLabel: p.otherFeesLabel || '',
          deposit: fromMinorUnits(p.deposit, p.currency),
          notes: p.notes || '',
          termsText: p.termsText || '',
          footerText: p.footerText || '',
        })
        setLoaded(true)
      })
    } else {
      api.get<{ settings: DocumentSettings }>(`/api/companies/${activeCompanyId}/settings`).then((res) => {
        const s = res.settings
        setForm((f) => ({
          ...f,
          currency: s.defaultCurrency,
          template: s.defaultTemplate,
          customization: { primaryColor: s.primaryColor, secondaryColor: s.secondaryColor },
          termsText: s.defaultTerms || '',
          footerText: s.defaultFooter || '',
          notes: s.defaultNotes || '',
          items: [emptyItem(taxes.find((t) => t.isDefault))],
        }))
        setLoaded(true)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeCompanyId])

  const totals = computeDocumentTotals({
    items: form.items.map((it) => ({ quantity: it.quantity, unitPrice: it.unitPrice, discountPercent: it.discountPercent, taxRate: it.taxRate })),
    currency: form.currency,
    discountType: form.discountType,
    discountValue: form.discountValue,
    shippingFee: form.shippingFee,
    otherFees: form.otherFees,
    deposit: form.deposit,
  })

  const buildPayload = useCallback(
    () => ({
      clientId: form.clientId,
      reference: form.reference || undefined,
      object: form.object || undefined,
      salesperson: form.salesperson || undefined,
      issueDate: form.issueDate ? new Date(form.issueDate).toISOString() : undefined,
      expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
      paymentTermId: form.paymentTermId || null,
      deliveryDelay: form.deliveryDelay || undefined,
      currency: form.currency,
      template: form.template,
      customization: form.customization,
      items: form.items
        .filter((it) => it.name.trim())
        .map((it) => ({
          productId: it.productId || null,
          reference: it.reference,
          name: it.name,
          description: it.description,
          quantity: it.quantity || 1,
          unit: it.unit || 'unité',
          unitPrice: it.unitPrice || 0,
          discountPercent: it.discountPercent || 0,
          taxId: it.taxId || null,
          taxRate: it.taxRate || 0,
        })),
      discountType: form.discountType,
      discountValue: form.discountValue,
      shippingFee: form.shippingFee,
      otherFees: form.otherFees,
      otherFeesLabel: form.otherFeesLabel || undefined,
      deposit: form.deposit,
      notes: form.notes || undefined,
      termsText: form.termsText || undefined,
      footerText: form.footerText || undefined,
    }),
    [form]
  )

  // ── Autosave (debounce) ─────────────────────────────────────────────
  useEffect(() => {
    if (!loaded || !activeCompanyId) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    const canSave = form.clientId && form.items.some((it) => it.name.trim())
    if (!canSave || status === 'CONVERTED') return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveState('saving')
    saveTimer.current = setTimeout(async () => {
      try {
        const payload = buildPayload()
        if (proformaId) {
          const res = await api.put<{ proforma: Proforma }>(`/api/proformas/${proformaId}`, payload)
          setStatus(res.proforma.status)
        } else {
          const res = await api.post<{ proforma: Proforma }>(`/api/companies/${activeCompanyId}/proformas`, payload)
          setProformaId(res.proforma.id)
          setNumber(res.proforma.number)
          setStatus(res.proforma.status)
          navigate(`/proformas/${res.proforma.id}/modifier`, { replace: true })
        }
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }, 1000)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, loaded])

  async function handleDownload() {
    if (!proformaId) {
      pushToast('Enregistrez la proforma avant de télécharger le PDF', 'info')
      return
    }
    window.open(pdfUrl('proformas', proformaId), '_blank')
  }

  async function handleSend() {
    if (!proformaId) return
    try {
      await api.post(`/api/proformas/${proformaId}/send`)
      pushToast('Proforma envoyée par email', 'success')
      navigate(`/proformas/${proformaId}`)
    } catch (err: any) {
      pushToast(err.message, 'error')
    }
  }

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={24} />
      </div>
    )
  }

  const selectedClient = clients.find((c) => c.id === form.clientId)

  return (
    <div className="flex h-full flex-col">
      <div className="no-print flex items-center gap-3 border-b border-border bg-white px-6 py-3">
        <div>
          <p className="text-sm font-bold text-ink">{number || 'Nouvelle proforma'}</p>
          <p className="flex items-center gap-1 text-[11px] text-muted">
            {saveState === 'saving' && (
              <>
                <Loader2 size={11} className="animate-spin" /> Enregistrement…
              </>
            )}
            {saveState === 'saved' && (
              <>
                <Check size={11} className="text-emerald-600" /> Enregistré
              </>
            )}
            {saveState === 'idle' && 'Complétez le client et au moins une ligne pour enregistrer'}
            {saveState === 'error' && <span className="text-danger">Erreur d'enregistrement</span>}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex border border-border bg-gray-50 p-0.5 lg:hidden">
            <button onClick={() => setMobileView('edit')} className={` px-2.5 py-1.5 text-xs font-semibold ${mobileView === 'edit' ? 'bg-white shadow-sm' : 'text-muted'}`}>
              <Pencil size={13} className="inline mr-1" /> Modifier
            </button>
            <button onClick={() => setMobileView('preview')} className={` px-2.5 py-1.5 text-xs font-semibold ${mobileView === 'preview' ? 'bg-white shadow-sm' : 'text-muted'}`}>
              <Eye size={13} className="inline mr-1" /> Aperçu
            </button>
          </div>
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleDownload}>
            PDF
          </Button>
          <Button size="sm" icon={<Send size={14} />} onClick={handleSend} disabled={!proformaId || !selectedClient?.email}>
            Envoyer
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className={`w-full overflow-y-auto border-r border-border bg-base p-5 lg:block lg:w-[440px] lg:shrink-0 ${mobileView === 'edit' ? 'block' : 'hidden'}`}>
          <Section title="Client">
            <ClientPicker
              clients={clients}
              value={form.clientId}
              onChange={(clientId) => setForm((f) => ({ ...f, clientId }))}
              onClientCreated={(c) => setClients((prev) => [c, ...prev])}
              companyId={activeCompanyId!}
            />
          </Section>

          <Section title="Informations du document">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Référence" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              <Input label="Commercial" value={form.salesperson} onChange={(e) => setForm({ ...form, salesperson: e.target.value })} />
            </div>
            <Input label="Objet" value={form.object} onChange={(e) => setForm({ ...form, object: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Date d'émission" type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
              <Input label="Date d'expiration" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Conditions de paiement" value={form.paymentTermId} onChange={(e) => setForm({ ...form, paymentTermId: e.target.value })}>
                <option value="">—</option>
                {paymentTerms.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.label}
                  </option>
                ))}
              </Select>
              <Input label="Délai de livraison" value={form.deliveryDelay} onChange={(e) => setForm({ ...form, deliveryDelay: e.target.value })} />
            </div>
            <Select label="Devise" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Section>

          <Section title="Produits & services">
            <ItemsEditor items={form.items} onChange={(items) => setForm({ ...form, items })} products={products} taxes={taxes} currency={form.currency} />
          </Section>

          <Section title="Remise, frais & acompte">
            <div className="grid grid-cols-2 gap-3">
              <Select label="Type de remise" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as 'percent' | 'amount' })}>
                <option value="percent">Pourcentage</option>
                <option value="amount">Montant fixe</option>
              </Select>
              <Input
                label={`Remise globale ${form.discountType === 'percent' ? '(%)' : `(${form.currency})`}`}
                type="number"
                min={0}
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Frais de livraison" type="number" min={0} value={form.shippingFee} onChange={(e) => setForm({ ...form, shippingFee: Number(e.target.value) })} />
              <Input label="Acompte reçu" type="number" min={0} value={form.deposit} onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Autres frais" type="number" min={0} value={form.otherFees} onChange={(e) => setForm({ ...form, otherFees: Number(e.target.value) })} />
              <Input label="Libellé des frais" value={form.otherFeesLabel} onChange={(e) => setForm({ ...form, otherFeesLabel: e.target.value })} />
            </div>
          </Section>

          <Section title="Modèle & personnalisation">
            <div className="grid grid-cols-5 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setForm({ ...form, template: t.value })}
                  title={t.description}
                  className={` border px-1 py-2 text-[10px] font-semibold ${form.template === t.value ? 'border-brand bg-brand-light text-brand-dark' : 'border-border text-muted hover:bg-gray-50'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Couleur principale" value={form.customization.primaryColor || '#0a5c36'} onChange={(v) => setForm({ ...form, customization: { ...form.customization, primaryColor: v } })} />
              <ColorField label="Couleur secondaire" value={form.customization.secondaryColor || '#111827'} onChange={(v) => setForm({ ...form, customization: { ...form.customization, secondaryColor: v } })} />
            </div>
          </Section>

          <Section title="Textes du document">
            <Textarea label="Conditions de paiement" value={form.termsText} onChange={(e) => setForm({ ...form, termsText: e.target.value })} />
            <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <Textarea label="Pied de page" value={form.footerText} onChange={(e) => setForm({ ...form, footerText: e.target.value })} />
          </Section>
        </div>

        <div className={`flex-1 overflow-y-auto bg-gray-100 p-6 lg:block ${mobileView === 'preview' ? 'block' : 'hidden'}`}>
          <DocumentPreview
            docTitle="FACTURE PROFORMA"
            number={number || 'PF-BROUILLON'}
            statusLabel={STATUS_LABEL[status] || status}
            issueDate={form.issueDate}
            expiryDate={form.expiryDate || null}
            reference={form.reference}
            salesperson={form.salesperson}
            company={{
              name: activeCompany?.name || '',
              address: activeCompany?.address,
              phone: activeCompany?.phone,
              email: activeCompany?.email,
              website: activeCompany?.website,
              taxId: activeCompany?.taxId,
              rccm: activeCompany?.rccm,
              logoUrl: activeCompany?.logoUrl ? `${import.meta.env.VITE_API_BASE || 'http://localhost:4100'}${activeCompany.logoUrl}` : undefined,
            }}
            client={
              selectedClient
                ? {
                    name: selectedClient.name,
                    contactName: selectedClient.contactName,
                    address: selectedClient.address,
                    phone: selectedClient.phone,
                    email: selectedClient.email,
                  }
                : { name: '' }
            }
            items={totals.lines.map((l, i) => ({
              reference: form.items[i]?.reference,
              name: form.items[i]?.name || '',
              description: form.items[i]?.description,
              quantity: l.quantity,
              unit: form.items[i]?.unit || 'unité',
              unitPrice: l.unitPrice,
              discountPercent: l.discountPercent,
              lineTotal: l.lineTotal,
              taxRate: l.taxRate,
            }))}
            currency={form.currency}
            template={form.template}
            customization={form.customization}
            subtotal={totals.subtotal}
            discountType={form.discountType}
            discountValue={form.discountValue}
            discountAmount={totals.discountAmount}
            taxAmount={totals.taxAmount}
            shippingFee={totals.shippingFee}
            otherFees={totals.otherFees}
            otherFeesLabel={form.otherFeesLabel}
            deposit={totals.deposit}
            total={totals.total}
            balanceDue={totals.balanceDue}
            notes={form.notes}
            termsText={form.termsText}
            footerText={form.footerText}
          />
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 border border-border bg-white p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">{title}</p>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-ink">{label}</span>
      <div className="flex h-10 items-center gap-2 border border-border px-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0" />
        <span className="text-xs text-muted">{value}</span>
      </div>
    </label>
  )
}
