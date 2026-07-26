import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, CreditCard, X, Check, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react'
import { api, fmt } from '../../lib/api'
import { PageTitle } from '../../components/layout/Sidebar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'

/* ── Types ─────────────────────────────────────────────────────── */
type SubscriptionPlan = {
  id: string
  slug: string
  name: string
  max_products: number
  max_employees: number
  max_orders: number
  storage_limit_mb: number
  commission_rate: number
  price_monthly: number
  price_yearly: number
  features: string // tableau JSON sérialisé
  is_active: boolean
  position: number
}

type FormData = {
  slug: string; name: string
  maxProducts: number; maxEmployees: number; maxOrders: number; storageLimitMb: number
  commissionRate: number; priceMonthly: number; priceYearly: number
  featuresText: string // une fonctionnalité par ligne, converti en tableau JSON à l'envoi
  isActive: boolean; position: number
}

const EMPTY: FormData = {
  slug: '', name: '',
  maxProducts: 0, maxEmployees: 0, maxOrders: 0, storageLimitMb: 0,
  commissionRate: 5, priceMonthly: 0, priceYearly: 0,
  featuresText: '', isActive: true, position: 0,
}

function slugify(s: string) {
  return s.toLowerCase()
    .normalize('NFD').replace(/\p{Mn}/gu, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function parseFeatures(raw: string): string[] {
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((f) => typeof f === 'string') : []
  } catch {
    return []
  }
}

/* ── Plan Modal ────────────────────────────────────────────────── */
function PlanModal({ plan, onClose, onSave, saving }: { plan: SubscriptionPlan | null; onClose: () => void; onSave: (data: FormData) => void; saving: boolean }) {
  const [form, setForm] = useState<FormData>(
    plan
      ? {
          slug: plan.slug, name: plan.name,
          maxProducts: plan.max_products, maxEmployees: plan.max_employees, maxOrders: plan.max_orders, storageLimitMb: plan.storage_limit_mb,
          commissionRate: plan.commission_rate, priceMonthly: plan.price_monthly, priceYearly: plan.price_yearly,
          featuresText: parseFeatures(plan.features).join('\n'), isActive: plan.is_active, position: plan.position,
        }
      : EMPTY
  )
  const [autoSlug, setAutoSlug] = useState(!plan)

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm((f) => ({ ...f, [k]: v }))
  const handleNameChange = (v: string) => {
    set('name', v)
    if (autoSlug) set('slug', slugify(v))
  }

  const numField = (label: string, key: keyof FormData, opts?: { hint?: string }) => (
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1 block">{label}</label>
      <input
        type="number" min={0}
        value={form[key] as number}
        onChange={(e) => set(key, (parseInt(e.target.value) || 0) as FormData[typeof key])}
        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
      />
      {opts?.hint && <p className="text-[10px] text-slate-400 mt-0.5">{opts.hint}</p>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-indigo-500" />
            <h2 className="text-base font-semibold text-slate-900">{plan ? 'Modifier le plan' : 'Nouveau plan'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nom <span className="text-red-400">*</span></label>
              <input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Pro"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 flex items-center justify-between">
              <span>Slug <span className="text-red-400">*</span></span>
              <button
                type="button"
                onClick={() => { setAutoSlug((v) => !v); if (!autoSlug) set('slug', slugify(form.name)) }}
                className="text-[10px] text-indigo-500 hover:underline"
              >
                {autoSlug ? '✎ Modifier manuellement' : '↻ Auto depuis le nom'}
              </button>
            </label>
            <input
              value={form.slug}
              onChange={(e) => { setAutoSlug(false); set('slug', e.target.value) }}
              placeholder="pro"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {numField('Produits max (0 = illimité)', 'maxProducts')}
            {numField('Employés max (0 = illimité)', 'maxEmployees')}
            {numField('Commandes max/mois (0 = illimité)', 'maxOrders')}
            {numField('Stockage (Mo, 0 = illimité)', 'storageLimitMb')}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {numField('Commission (%)', 'commissionRate')}
            {numField('Prix mensuel (FCFA)', 'priceMonthly')}
            {numField('Prix annuel (FCFA)', 'priceYearly')}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Fonctionnalités affichées (une par ligne)</label>
            <textarea
              value={form.featuresText}
              onChange={(e) => set('featuresText', e.target.value)}
              rows={4}
              placeholder={'500 produits\n5 utilisateurs\nSupport prioritaire'}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 items-center">
            <div className="w-28">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Position</label>
              <input
                type="number" min={0}
                value={form.position}
                onChange={(e) => set('position', parseInt(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex-1 flex items-center gap-2 pt-5">
              <button
                type="button"
                onClick={() => set('isActive', !form.isActive)}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${form.isActive ? 'text-emerald-600' : 'text-slate-400'}`}
              >
                {form.isActive ? <ToggleRight size={22} className="text-emerald-500" /> : <ToggleLeft size={22} />}
                {form.isActive ? 'Actif' : 'Inactif'}
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button size="sm" loading={saving} onClick={() => onSave(form)}>
            <Check size={14} /> {plan ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Delete confirm ───────────────────────────────────────────── */
function DeleteConfirm({ plan, onClose, onConfirm, loading }: { plan: SubscriptionPlan; onClose: () => void; onConfirm: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={22} className="text-red-500" />
        </div>
        <h3 className="font-semibold text-slate-900 mb-1">Supprimer le plan ?</h3>
        <p className="text-sm text-slate-500 mb-6">
          <strong>"{plan.name}"</strong> sera supprimé définitivement. Les marchands déjà abonnés à ce plan ne seront pas affectés automatiquement.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={loading}>Annuler</Button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? '...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────────────── */
export default function SubscriptionPlansPage() {
  const qc = useQueryClient()
  const [editPlan, setEditPlan] = useState<SubscriptionPlan | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deletePlan, setDeletePlan] = useState<SubscriptionPlan | null>(null)

  const { data, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['subscription-plans-admin'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/subscription-plans?all=true')
      // La route backend relaie tel quel le corps de merchantgo (déjà
      // enveloppé {success,data}) dans son propre {success,data} — même
      // convention que /api/admin/merchant-applications.
      return data.data.data as SubscriptionPlan[]
    },
  })
  const plans = data ?? []

  function toBody(form: FormData) {
    return {
      slug: form.slug, name: form.name,
      maxProducts: form.maxProducts, maxEmployees: form.maxEmployees, maxOrders: form.maxOrders, storageLimitMb: form.storageLimitMb,
      commissionRate: form.commissionRate, priceMonthly: form.priceMonthly, priceYearly: form.priceYearly,
      features: JSON.stringify(form.featuresText.split('\n').map((f) => f.trim()).filter(Boolean)),
      isActive: form.isActive, position: form.position,
    }
  }

  const createMut = useMutation({
    mutationFn: (body: object) => api.post('/api/admin/subscription-plans', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscription-plans-admin'] }); setModalOpen(false) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.put(`/api/admin/subscription-plans/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscription-plans-admin'] }); setModalOpen(false) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/subscription-plans/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscription-plans-admin'] }); setDeletePlan(null) },
  })

  function handleSave(form: FormData) {
    const body = toBody(form)
    if (editPlan) updateMut.mutate({ id: editPlan.id, body })
    else createMut.mutate(body)
  }

  const isSaving = createMut.isPending || updateMut.isPending
  const error = (createMut.error || updateMut.error || deleteMut.error) as Error | null

  return (
    <div className="space-y-5">
      <PageTitle
        title="Plans d'abonnement"
        sub={`${plans.length} plan${plans.length !== 1 ? 's' : ''}`}
        action={
          <Button size="sm" onClick={() => { setEditPlan(null); setModalOpen(true) }}>
            <Plus size={14} /> Nouveau plan
          </Button>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
          {(error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? error.message}
        </div>
      )}

      <Card>
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">Aucun plan</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {plans.map((plan) => (
              <div key={plan.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <CreditCard size={18} className="text-indigo-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{plan.name}</span>
                    <Badge label={plan.is_active ? 'active' : 'inactive'} />
                    <span className="text-xs font-mono text-slate-400">/{plan.slug}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                    <span>Commission {plan.commission_rate}%</span>
                    <span>{plan.price_monthly === 0 ? 'Sur devis' : `${fmt(plan.price_monthly)}/mois`}</span>
                    <span>{plan.max_products === 0 ? 'Produits illimités' : `${plan.max_products} produits max`}</span>
                  </div>
                </div>

                <div className="text-xs font-mono text-slate-300 w-8 text-center hidden md:block">#{plan.position}</div>

                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditPlan(plan); setModalOpen(true) }}
                    className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all"
                    title="Modifier"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeletePlan(plan)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {modalOpen && (
        <PlanModal plan={editPlan} onClose={() => setModalOpen(false)} onSave={handleSave} saving={isSaving} />
      )}
      {deletePlan && (
        <DeleteConfirm
          plan={deletePlan}
          onClose={() => setDeletePlan(null)}
          onConfirm={() => deleteMut.mutate(deletePlan.id)}
          loading={deleteMut.isPending}
        />
      )}
    </div>
  )
}
