import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, FileText, Repeat, Play, Pause } from '../components/ui/Icon'
import { api } from '../lib/api'
import { formatMoney, CURRENCIES } from '../lib/money'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Field'
import { EmptyState } from '../components/ui/EmptyState'
import { ItemsEditor, emptyItem, type EditorItem } from '../components/invoice/ItemsEditor'
import { computeDocumentTotals } from '../lib/calculations'
import type { Client, Currency, Product, ProformaTemplate, RecurringPlan, Tax, TemplateContent } from '../types'

type Tab = 'templates' | 'recurring'

const INTERVAL_LABEL: Record<string, string> = { monthly: 'Mensuelle', quarterly: 'Trimestrielle', yearly: 'Annuelle' }

export default function AutomationPage() {
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId)
  const pushToast = useUiStore((s) => s.pushToast)
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('templates')
  const [templates, setTemplates] = useState<ProformaTemplate[] | null>(null)
  const [plans, setPlans] = useState<RecurringPlan[] | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [taxes, setTaxes] = useState<Tax[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [useTemplateModal, setUseTemplateModal] = useState<ProformaTemplate | null>(null)

  async function loadAll() {
    if (!activeCompanyId) return
    const [t, p, c, pr, tx] = await Promise.all([
      api.get<{ templates: ProformaTemplate[] }>(`/api/companies/${activeCompanyId}/proforma-templates`),
      api.get<{ plans: RecurringPlan[] }>(`/api/companies/${activeCompanyId}/recurring-plans`),
      api.get<{ clients: Client[] }>(`/api/companies/${activeCompanyId}/clients`),
      api.get<{ products: Product[] }>(`/api/companies/${activeCompanyId}/products`),
      api.get<{ taxes: Tax[] }>(`/api/companies/${activeCompanyId}/taxes`),
    ])
    setTemplates(t.templates)
    setPlans(p.plans)
    setClients(c.clients)
    setProducts(pr.products)
    setTaxes(tx.taxes)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId])

  async function deleteTemplate(id: string) {
    await api.delete(`/api/proforma-templates/${id}`)
    pushToast('Modèle supprimé', 'success')
    loadAll()
  }

  async function togglePlan(id: string) {
    await api.post(`/api/recurring-plans/${id}/toggle`)
    loadAll()
  }

  async function deletePlan(id: string) {
    await api.delete(`/api/recurring-plans/${id}`)
    pushToast('Plan supprimé', 'success')
    loadAll()
  }

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Automatisation</h1>
          <p className="text-sm text-muted">Modèles réutilisables et facturation récurrente.</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>
          {tab === 'templates' ? 'Nouveau modèle' : 'Nouveau plan récurrent'}
        </Button>
      </div>

      <div className="flex gap-1 border border-border bg-white p-1 sm:w-fit">
        <button
          onClick={() => setTab('templates')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold ${tab === 'templates' ? 'bg-brand-light text-brand-dark' : 'text-muted hover:bg-gray-50'}`}
        >
          <FileText size={14} /> Modèles
        </button>
        <button
          onClick={() => setTab('recurring')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold ${tab === 'recurring' ? 'bg-brand-light text-brand-dark' : 'text-muted hover:bg-gray-50'}`}
        >
          <Repeat size={14} /> Facturation récurrente
        </button>
      </div>

      {tab === 'templates' &&
        (templates === null ? null : templates.length === 0 ? (
          <EmptyState icon={<FileText size={20} />} title="Aucun modèle" description="Créez un modèle pour démarrer rapidement une nouvelle proforma type." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div key={t.id} className="border border-border bg-white p-4">
                <p className="text-sm font-bold text-ink">{t.name}</p>
                <p className="mt-1 text-xs text-muted">{t.client?.name || 'Sans client par défaut'}</p>
                <p className="mt-1 text-xs text-muted">{t.content.items.length} ligne(s)</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" icon={<Play size={12} />} onClick={() => setUseTemplateModal(t)}>
                    Utiliser
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Trash2 size={12} />} onClick={() => deleteTemplate(t.id)} />
                </div>
              </div>
            ))}
          </div>
        ))}

      {tab === 'recurring' &&
        (plans === null ? null : plans.length === 0 ? (
          <EmptyState icon={<Repeat size={20} />} title="Aucune facturation récurrente" description="Créez un plan pour un service qui se répète (hébergement, maintenance, abonnement…)." />
        ) : (
          <div className="overflow-x-auto border border-border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Libellé</th>
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Fréquence</th>
                  <th className="px-3 py-3">Prochaine échéance</th>
                  <th className="px-3 py-3">Générées</th>
                  <th className="px-3 py-3">Statut</th>
                  <th className="w-24 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-semibold text-ink">{p.label}</td>
                    <td className="px-3 py-3 text-muted">{p.client?.name}</td>
                    <td className="px-3 py-3 text-muted">{INTERVAL_LABEL[p.interval]}</td>
                    <td className="px-3 py-3 text-muted">{new Date(p.nextRunAt).toLocaleDateString('fr-FR')}</td>
                    <td className="px-3 py-3 text-muted">{p._count?.generatedProformas ?? 0}</td>
                    <td className="px-3 py-3">
                      <span className={` px-2 py-1 text-[11px] font-bold ${p.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.active ? 'Actif' : 'En pause'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => togglePlan(p.id)} className="p-1.5 text-muted hover:bg-gray-100" title={p.active ? 'Mettre en pause' : 'Réactiver'}>
                          {p.active ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <button onClick={() => deletePlan(p.id)} className="p-1.5 text-muted hover:bg-red-50 hover:text-danger">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        kind={tab}
        companyId={activeCompanyId!}
        clients={clients}
        products={products}
        taxes={taxes}
        onCreated={loadAll}
      />

      {useTemplateModal && (
        <UseTemplateModal template={useTemplateModal} clients={clients} onClose={() => setUseTemplateModal(null)} onCreated={(id) => navigate(`/proformas/${id}/modifier`)} />
      )}
    </div>
  )
}

function CreateModal({
  open,
  onClose,
  kind,
  companyId,
  clients,
  products,
  taxes,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  kind: Tab
  companyId: string
  clients: Client[]
  products: Product[]
  taxes: Tax[]
  onCreated: () => void
}) {
  const pushToast = useUiStore((s) => s.pushToast)
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [currency, setCurrency] = useState<Currency>('XOF')
  const [items, setItems] = useState<EditorItem[]>([emptyItem()])
  const [interval, setInterval] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [nextRunAt, setNextRunAt] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setClientId('')
      setItems([emptyItem()])
    }
  }, [open])

  const totals = computeDocumentTotals({
    items: items.map((it) => ({ quantity: it.quantity, unitPrice: it.unitPrice, discountPercent: it.discountPercent, taxRate: it.taxRate })),
    currency,
    discountType: 'percent',
    discountValue: 0,
    shippingFee: 0,
    otherFees: 0,
    deposit: 0,
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const validItems = items.filter((it) => it.name.trim())
    if (validItems.length === 0) return pushToast('Ajoutez au moins une ligne', 'error')

    const content: TemplateContent = {
      items: validItems,
      discountType: 'percent',
      discountValue: 0,
      shippingFee: 0,
      otherFees: 0,
      deposit: 0,
      template: 'classic',
    }

    setLoading(true)
    try {
      if (kind === 'templates') {
        if (!name.trim()) throw new Error('Le nom du modèle est requis')
        await api.post(`/api/companies/${companyId}/proforma-templates`, { name, clientId: clientId || null, content })
        pushToast('Modèle créé', 'success')
      } else {
        if (!clientId) throw new Error('Le client est requis')
        if (!name.trim()) throw new Error('Le libellé est requis')
        await api.post(`/api/companies/${companyId}/recurring-plans`, {
          clientId,
          label: name,
          interval,
          nextRunAt: new Date(nextRunAt).toISOString(),
          currency,
          content,
        })
        pushToast('Plan récurrent créé', 'success')
      }
      onCreated()
      onClose()
    } catch (err: any) {
      pushToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={kind === 'templates' ? 'Nouveau modèle' : 'Nouveau plan récurrent'} width="max-w-2xl">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input label={kind === 'templates' ? 'Nom du modèle' : 'Libellé'} required value={name} onChange={(e) => setName(e.target.value)} />

        <Select label={kind === 'templates' ? 'Client par défaut (optionnel)' : 'Client'} required={kind === 'recurring'} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">—</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        {kind === 'recurring' && (
          <div className="grid grid-cols-2 gap-3">
            <Select label="Fréquence" value={interval} onChange={(e) => setInterval(e.target.value as any)}>
              <option value="monthly">Mensuelle</option>
              <option value="quarterly">Trimestrielle</option>
              <option value="yearly">Annuelle</option>
            </Select>
            <Input label="Première échéance" type="date" value={nextRunAt} onChange={(e) => setNextRunAt(e.target.value)} />
          </div>
        )}

        <Select label="Devise" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>

        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Contenu</p>
        <ItemsEditor items={items} onChange={setItems} products={products} taxes={taxes} currency={currency} />

        <div className="bg-gray-50 px-3 py-2 text-right text-sm font-bold text-ink">Total : {formatMoney(totals.total, currency)}</div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            Créer
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function UseTemplateModal({
  template,
  clients,
  onClose,
  onCreated,
}: {
  template: ProformaTemplate
  clients: Client[]
  onClose: () => void
  onCreated: (proformaId: string) => void
}) {
  const [clientId, setClientId] = useState(template.clientId || '')
  const [loading, setLoading] = useState(false)
  const pushToast = useUiStore((s) => s.pushToast)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) return
    setLoading(true)
    try {
      const res = await api.post<{ proforma: { id: string } }>(`/api/proforma-templates/${template.id}/use`, { clientId, currency: 'XOF' })
      onCreated(res.proforma.id)
    } catch (err: any) {
      pushToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Utiliser "${template.name}"`}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Select label="Client" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Sélectionner…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            Créer la proforma
          </Button>
        </div>
      </form>
    </Modal>
  )
}
