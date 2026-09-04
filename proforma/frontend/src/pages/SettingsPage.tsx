import { useEffect, useState, useRef } from 'react'
import { Upload, Trash2, Plus, Building2, FileText, Palette, Receipt as ReceiptIcon, Users, Download } from '../components/ui/Icon'
import { api, assetUrl } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { Input, Select, Textarea } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { TEMPLATES } from '../lib/templates'
import { CURRENCIES } from '../lib/money'
import { TeamTab } from '../components/settings/TeamTab'
import { ExportTab } from '../components/settings/ExportTab'
import type { Currency, DocumentSettings, PaymentTerm, TemplateName, Tax } from '../types'

type Tab = 'company' | 'billing' | 'appearance' | 'taxes' | 'team' | 'export'

export default function SettingsPage() {
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId)
  const companies = useAuthStore((s) => s.companies)
  const updateCompany = useAuthStore((s) => s.updateCompany)
  const pushToast = useUiStore((s) => s.pushToast)
  const company = companies.find((c) => c.id === activeCompanyId)

  const [tab, setTab] = useState<Tab>('company')
  const [settings, setSettings] = useState<DocumentSettings | null>(null)
  const [taxes, setTaxes] = useState<Tax[]>([])
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([])
  const [companyForm, setCompanyForm] = useState({ name: '', address: '', phone: '', email: '', website: '', taxId: '', rccm: '', legalInfo: '' })
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!activeCompanyId) return
    api.get<{ settings: DocumentSettings }>(`/api/companies/${activeCompanyId}/settings`).then((r) => setSettings(r.settings))
    api.get<{ taxes: Tax[] }>(`/api/companies/${activeCompanyId}/taxes`).then((r) => setTaxes(r.taxes))
    api.get<{ paymentTerms: PaymentTerm[] }>(`/api/companies/${activeCompanyId}/payment-terms`).then((r) => setPaymentTerms(r.paymentTerms))
  }, [activeCompanyId])

  useEffect(() => {
    if (company) {
      setCompanyForm({
        name: company.name,
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || '',
        website: company.website || '',
        taxId: company.taxId || '',
        rccm: company.rccm || '',
        legalInfo: company.legalInfo || '',
      })
    }
  }, [company])

  async function saveCompany() {
    const res = await api.put<{ company: typeof company }>(`/api/companies/${activeCompanyId}`, companyForm)
    updateCompany(res.company as any)
    pushToast('Informations enregistrées', 'success')
  }

  async function saveSettings(patch: Partial<DocumentSettings>) {
    const res = await api.put<{ settings: DocumentSettings }>(`/api/companies/${activeCompanyId}/settings`, patch)
    setSettings(res.settings)
  }

  async function handleLogoUpload(file: File) {
    const form = new FormData()
    form.append('logo', file)
    try {
      const res = await api.postForm<{ company: typeof company }>(`/api/companies/${activeCompanyId}/logo`, form)
      updateCompany(res.company as any)
      pushToast('Logo mis à jour', 'success')
    } catch (err: any) {
      pushToast(err.message, 'error')
    }
  }

  async function removeLogo() {
    const res = await api.delete<{ company: typeof company }>(`/api/companies/${activeCompanyId}/logo`)
    updateCompany(res.company as any)
  }

  async function addTax(name: string, rate: number) {
    const res = await api.post<{ tax: Tax }>(`/api/companies/${activeCompanyId}/taxes`, { name, rate })
    setTaxes((t) => [...t, res.tax])
  }

  async function removeTax(id: string) {
    await api.delete(`/api/taxes/${id}`)
    setTaxes((t) => t.filter((x) => x.id !== id))
  }

  async function addPaymentTerm(label: string) {
    const res = await api.post<{ paymentTerm: PaymentTerm }>(`/api/companies/${activeCompanyId}/payment-terms`, { label })
    setPaymentTerms((t) => [...t, res.paymentTerm])
  }

  async function removePaymentTerm(id: string) {
    await api.delete(`/api/payment-terms/${id}`)
    setPaymentTerms((t) => t.filter((x) => x.id !== id))
  }

  if (!company || !settings) return null

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'company', label: 'Entreprise', icon: <Building2 size={15} /> },
    { id: 'billing', label: 'Facturation', icon: <FileText size={15} /> },
    { id: 'appearance', label: 'Apparence & textes', icon: <Palette size={15} /> },
    { id: 'taxes', label: 'Taxes & conditions', icon: <ReceiptIcon size={15} /> },
    { id: 'team', label: 'Équipe', icon: <Users size={15} /> },
    { id: 'export', label: 'Export comptable', icon: <Download size={15} /> },
  ]

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <h1 className="text-xl font-extrabold text-ink">Paramètres</h1>

      <div className="flex gap-1 border border-border bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold ${tab === t.id ? 'bg-brand-light text-brand-dark' : 'text-muted hover:bg-gray-50'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'company' && (
        <div className="max-w-2xl border border-border bg-white p-5">
          <p className="mb-4 text-sm font-bold text-ink">Logo</p>
          <div className="mb-6 flex items-center gap-4">
            {company.logoUrl ? (
              <img src={assetUrl(company.logoUrl)} alt="" className="h-16 w-16 border border-border object-contain p-1" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center border border-dashed border-border text-muted">
                <Building2 size={20} />
              </div>
            )}
            <div className="flex gap-2">
              <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
              <Button variant="secondary" size="sm" icon={<Upload size={13} />} onClick={() => fileInput.current?.click()}>
                Changer le logo
              </Button>
              {company.logoUrl && (
                <Button variant="ghost" size="sm" icon={<Trash2 size={13} />} onClick={removeLogo}>
                  Retirer
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Input label="Nom de l'entreprise" value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} />
            <Textarea label="Adresse" value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Téléphone" value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} />
              <Input label="Email" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} />
            </div>
            <Input label="Site internet" value={companyForm.website} onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Numéro fiscal (NIF)" value={companyForm.taxId} onChange={(e) => setCompanyForm({ ...companyForm, taxId: e.target.value })} />
              <Input label="RCCM" value={companyForm.rccm} onChange={(e) => setCompanyForm({ ...companyForm, rccm: e.target.value })} />
            </div>
            <Button onClick={saveCompany} className="self-start">
              Enregistrer
            </Button>
          </div>
        </div>
      )}

      {tab === 'billing' && (
        <div className="max-w-2xl border border-border bg-white p-5">
          <p className="mb-4 text-sm font-bold text-ink">Numérotation & devise</p>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Préfixe proforma" defaultValue={settings.proformaPrefix} onBlur={(e) => saveSettings({ proformaPrefix: e.target.value })} />
              <Input label="Format" defaultValue={settings.proformaNumberFmt} hint="{PREFIX}-{YEAR}-{NUMBER}" onBlur={(e) => saveSettings({ proformaNumberFmt: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Préfixe facture" defaultValue={settings.invoicePrefix} onBlur={(e) => saveSettings({ invoicePrefix: e.target.value })} />
              <Input label="Format" defaultValue={settings.invoiceNumberFmt} hint="{PREFIX}-{YEAR}-{NUMBER}" onBlur={(e) => saveSettings({ invoiceNumberFmt: e.target.value })} />
            </div>
            <Select label="Devise par défaut" value={settings.defaultCurrency} onChange={(e) => saveSettings({ defaultCurrency: e.target.value as Currency })}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-muted">Prochain numéro de proforma : {settings.proformaPrefix}-{new Date().getFullYear()}-{String(settings.proformaCounter + 1).padStart(4, '0')}</p>
          </div>
        </div>
      )}

      {tab === 'appearance' && (
        <div className="max-w-2xl border border-border bg-white p-5">
          <p className="mb-4 text-sm font-bold text-ink">Modèle & couleurs par défaut</p>
          <div className="mb-4 grid grid-cols-5 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.value}
                onClick={() => saveSettings({ defaultTemplate: t.value as TemplateName })}
                className={` border px-1 py-2 text-[10px] font-semibold ${settings.defaultTemplate === t.value ? 'border-brand bg-brand-light text-brand-dark' : 'border-border text-muted hover:bg-gray-50'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="mb-6 grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink">Couleur principale</span>
              <input type="color" defaultValue={settings.primaryColor} onChange={(e) => saveSettings({ primaryColor: e.target.value })} className="h-10 w-full cursor-pointer border border-border" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink">Couleur secondaire</span>
              <input type="color" defaultValue={settings.secondaryColor} onChange={(e) => saveSettings({ secondaryColor: e.target.value })} className="h-10 w-full cursor-pointer border border-border" />
            </label>
          </div>

          <p className="mb-3 text-sm font-bold text-ink">Textes par défaut</p>
          <div className="flex flex-col gap-3">
            <Textarea label="Conditions de paiement par défaut" defaultValue={settings.defaultTerms || ''} onBlur={(e) => saveSettings({ defaultTerms: e.target.value })} />
            <Textarea label="Notes par défaut" defaultValue={settings.defaultNotes || ''} onBlur={(e) => saveSettings({ defaultNotes: e.target.value })} />
            <Textarea label="Pied de page par défaut" defaultValue={settings.defaultFooter || ''} onBlur={(e) => saveSettings({ defaultFooter: e.target.value })} />
          </div>
        </div>
      )}

      {tab === 'taxes' && (
        <div className="grid max-w-2xl grid-cols-1 gap-5">
          <ListManager title="Taxes" items={taxes.map((t) => ({ id: t.id, label: `${t.name} — ${t.rate}%` }))} onAdd={() => {}} onRemove={removeTax} customAdd={<TaxAddForm onAdd={addTax} />} />
          <ListManager
            title="Conditions de paiement"
            items={paymentTerms.map((t) => ({ id: t.id, label: t.label }))}
            onAdd={() => {}}
            onRemove={removePaymentTerm}
            customAdd={<PaymentTermAddForm onAdd={addPaymentTerm} />}
          />
        </div>
      )}

      {tab === 'team' && activeCompanyId && <TeamTab companyId={activeCompanyId} myRole={company.myRole} />}

      {tab === 'export' && activeCompanyId && <ExportTab companyId={activeCompanyId} myRole={company.myRole} />}
    </div>
  )
}

function ListManager({ title, items, onRemove, customAdd }: { title: string; items: { id: string; label: string }[]; onAdd: () => void; onRemove: (id: string) => void; customAdd?: React.ReactNode }) {
  return (
    <div className="border border-border bg-white p-5">
      <p className="mb-3 text-sm font-bold text-ink">{title}</p>
      <div className="mb-3 flex flex-col gap-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between border border-border px-3 py-2 text-sm">
            <span>{it.label}</span>
            <button onClick={() => onRemove(it.id)} className="text-muted hover:text-danger">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-muted">Aucun élément.</p>}
      </div>
      {customAdd}
    </div>
  )
}

function TaxAddForm({ onAdd }: { onAdd: (name: string, rate: number) => void }) {
  const [name, setName] = useState('')
  const [rate, setRate] = useState(0)
  return (
    <div className="flex gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom (ex: TVA)" className="h-9 flex-1 border border-border px-2 text-xs" />
      <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} placeholder="%" className="h-9 w-16 border border-border px-2 text-xs" />
      <Button
        size="sm"
        icon={<Plus size={13} />}
        onClick={() => {
          if (!name.trim()) return
          onAdd(name, rate)
          setName('')
          setRate(0)
        }}
      >
        Ajouter
      </Button>
    </div>
  )
}

function PaymentTermAddForm({ onAdd }: { onAdd: (label: string) => void }) {
  const [label, setLabel] = useState('')
  return (
    <div className="flex gap-2">
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: 30 jours net" className="h-9 flex-1 border border-border px-2 text-xs" />
      <Button
        size="sm"
        icon={<Plus size={13} />}
        onClick={() => {
          if (!label.trim()) return
          onAdd(label)
          setLabel('')
        }}
      >
        Ajouter
      </Button>
    </div>
  )
}
