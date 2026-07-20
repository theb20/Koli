import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Percent, Star, ToggleLeft, ToggleRight, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal, Confirm } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { PageTitle } from '../components/layout/Sidebar'

/* ── Types ── */
type TaxRate = {
  id: string
  name: string
  rate: number
  isDefault: boolean
  isActive: boolean
  createdAt: string
}

/* ── Zod schema ── */
const schema = z.object({
  name:      z.string().min(2).max(80),
  rate:      z.coerce.number().min(0).max(100),
  isDefault: z.boolean().default(false),
  isActive:  z.boolean().default(true),
})
type FormData = z.infer<typeof schema>

async function fetchTaxes() {
  const { data } = await api.get('/api/tax/admin/all')
  return data.data?.taxes as TaxRate[]
}

export default function TaxPage() {
  const qc = useQueryClient()
  const [open,     setOpen]     = useState(false)
  const [editing,  setEditing]  = useState<TaxRate | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: taxes = [], isLoading } = useQuery({
    queryKey: ['taxes-admin'],
    queryFn:  fetchTaxes,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as import('react-hook-form').Resolver<FormData>,
    defaultValues: { isDefault: false, isActive: true },
  })

  /* ── Create ── */
  const createMutation = useMutation({
    mutationFn: (body: FormData) => api.post('/api/tax', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['taxes-admin'] }); setOpen(false); reset() },
  })

  /* ── Update ── */
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: FormData }) => api.put(`/api/tax/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['taxes-admin'] }); setEditing(null); reset() },
  })

  /* ── Delete ── */
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/tax/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['taxes-admin'] }); setDeleteId(null) },
  })

  /* ── Set default ── */
  const defaultMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/tax/${id}/default`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taxes-admin'] }),
  })

  /* ── Toggle active ── */
  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/tax/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taxes-admin'] }),
  })

  function openEdit(tax: TaxRate) {
    setEditing(tax)
    reset({ name: tax.name, rate: tax.rate, isDefault: tax.isDefault, isActive: tax.isActive })
  }

  function openCreate() {
    setEditing(null)
    reset({ name: '', rate: 18, isDefault: false, isActive: true })
    setOpen(true)
  }

  const onSubmit = (data: FormData) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, body: data })
    } else {
      createMutation.mutate(data)
    }
  }

  const cardCls = 'bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden'

  return (
    <div className="space-y-6 max-w-4xl">
      <PageTitle title="TVA & Taxes" sub="Gérer les taux de TVA appliqués aux commandes" />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Taux créés',   value: taxes.length,                                              color: 'bg-indigo-50 text-indigo-700' },
          { label: 'Actifs',       value: taxes.filter(t => t.isActive).length,                      color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Taux défaut',  value: (taxes.find(t => t.isDefault)?.rate?.toFixed(1) ?? '—') + (taxes.find(t => t.isDefault) ? ' %' : ''), color: 'bg-amber-50 text-amber-700' },
        ].map(k => (
          <div key={k.label} className={`${k.color} rounded-2xl p-5`}>
            <p className="text-2xl font-black">{k.value}</p>
            <p className="text-xs font-semibold mt-1 opacity-70">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Header + New */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Liste des taux</h2>
        <Button icon={<Plus size={15} />} onClick={openCreate}>Nouveau taux</Button>
      </div>

      {/* Table */}
      <div className={cardCls}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : taxes.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Percent size={28} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aucun taux de TVA créé</p>
            <p className="text-xs mt-1">Créez votre premier taux pour l'appliquer aux commandes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Nom', 'Taux', 'Statut', 'Défaut', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {taxes.map(tax => (
                <tr key={tax.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Percent size={14} className="text-indigo-600" />
                      </div>
                      <span className="font-medium text-slate-900">{tax.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-bold text-slate-900 text-base">{tax.rate.toFixed(1)} %</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => toggleMutation.mutate(tax.id)}
                      className="flex items-center gap-1.5"
                      title={tax.isActive ? 'Désactiver' : 'Activer'}
                    >
                      {tax.isActive
                        ? <ToggleRight size={20} className="text-emerald-500" />
                        : <ToggleLeft size={20} className="text-slate-300" />
                      }
                      <Badge label={tax.isActive ? 'active' : 'inactive'} />
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    {tax.isDefault ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Star size={10} className="fill-amber-500" /> Défaut
                      </span>
                    ) : (
                      <button
                        onClick={() => defaultMutation.mutate(tax.id)}
                        className="text-xs text-slate-400 hover:text-indigo-600 font-medium transition-colors"
                      >
                        Définir par défaut
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(tax)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                        title="Modifier"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(tax.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">📌 Comment ça fonctionne</p>
        <ul className="list-disc list-inside space-y-1 text-xs opacity-80">
          <li>Le taux marqué <strong>Défaut</strong> est automatiquement appliqué à chaque nouvelle commande.</li>
          <li>La TVA est calculée sur le sous-total HT (articles uniquement, hors livraison).</li>
          <li>Si aucun taux par défaut n'est actif, les commandes sont créées sans TVA (0 %).</li>
        </ul>
      </div>

      {/* Modal création / édition */}
      <Modal
        open={open || !!editing}
        onClose={() => { setOpen(false); setEditing(null); reset() }}
        title={editing ? 'Modifier le taux' : 'Nouveau taux de TVA'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nom du taux"
            placeholder="Ex : TVA Standard"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Taux (%)"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="18"
            error={errors.rate?.message}
            {...register('rate')}
          />
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...register('isDefault')} className="rounded" />
              <span className="font-medium text-slate-700">Définir comme taux par défaut</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...register('isActive')} className="rounded" />
              <span className="font-medium text-slate-700">Actif</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => { setOpen(false); setEditing(null); reset() }}>
              Annuler
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm suppression */}
      <Confirm
        open={!!deleteId}
        title="Supprimer ce taux ?"
        message="Cette action est irréversible. Les commandes existantes conservent leur taux enregistré."
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onClose={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
