import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Tag, ToggleLeft, ToggleRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api, fmt, fmtDate } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Modal, Confirm } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { PageTitle } from '../components/layout/Sidebar'
import type { PromoCode } from '../types'

const schema = z.object({
  code:      z.string().min(3).max(20).toUpperCase(),
  type:      z.enum(['percent', 'fixed']),
  value:     z.coerce.number().positive(),
  minOrder:  z.coerce.number().nonnegative().default(0),
  maxUses:   z.coerce.number().int().positive().optional().or(z.literal('')),
  expiresAt: z.string().optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

async function fetchPromos() {
  const { data } = await api.get('/api/promo/admin/all')
  return data.data
}

export default function PromoPage() {
  const qc = useQueryClient()
  const [open, setOpen]         = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['promos'], queryFn: fetchPromos })
  const promos: PromoCode[] = data?.promos ?? []

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as import('react-hook-form').Resolver<FormData>,
    defaultValues: { type: 'percent', minOrder: 0 },
  })

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post('/api/promo', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promos'] }); setOpen(false); reset() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/promo/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promos'] }); setDeleteId(null) },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.patch(`/api/promo/${id}/toggle`, { isActive: !isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promos'] }),
  })

  const onSubmit = (data: FormData) => {
    const rawType = data.type
    createMutation.mutate({
      code:      data.code.toUpperCase(),
      type:      rawType,
      value:     Math.round(Number(data.value)),
      minOrder:  Math.round(Number(data.minOrder ?? 0)),
      maxUses:   data.maxUses ? Number(data.maxUses) : undefined,
      /* La date ISO est requise — on convertit "2026-01-15" → "2026-01-15T00:00:00.000Z" */
      expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
    })
  }

  return (
    <div className="space-y-5">
      <PageTitle
        title="Codes promo"
        sub={`${promos.length} codes`}
        action={<Button icon={<Plus size={15} />} onClick={() => setOpen(true)}>Nouveau code</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total codes', value: promos.length },
          { label: 'Actifs', value: promos.filter(p => p.isActive).length },
          { label: 'Utilisations totales', value: promos.reduce((s, p) => s + p.usedCount, 0) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['Code', 'Type', 'Valeur', 'Commande min.', 'Utilisations', 'Expire le', 'Statut', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-8 bg-slate-100 rounded-lg animate-pulse" /></td></tr>
              ))
            ) : promos.length === 0 ? (
              <tr><td colSpan={8} className="py-16 text-center">
                <Tag size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Aucun code promo</p>
              </td></tr>
            ) : (
              promos.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-indigo-700 text-sm bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{p.code}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{p.type === 'percent' ? 'Pourcentage' : 'Fixe'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                    {p.type === 'percent' ? `${p.value}%` : fmt(p.value)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{fmt(p.minOrder)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-slate-900">{p.usedCount}</span>
                      {p.maxUses && <span className="text-slate-400">/ {p.maxUses}</span>}
                    </div>
                    {p.maxUses && (
                      <div className="mt-1 h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (p.usedCount / p.maxUses) * 100)}%` }} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.expiresAt ? fmtDate(p.expiresAt) : 'Illimité'}</td>
                  <td className="px-4 py-3"><Badge label={p.isActive ? 'active' : 'inactive'} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleMutation.mutate({ id: p.id, isActive: p.isActive })}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all" title="Activer/désactiver">
                        {p.isActive ? <ToggleRight size={14} className="text-green-500" /> : <ToggleLeft size={14} />}
                      </button>
                      <button onClick={() => setDeleteId(p.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      <Modal open={open} onClose={() => { setOpen(false); reset() }} title="Créer un code promo">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {createMutation.isError && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
              Erreur — code déjà utilisé ou données invalides
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Code" {...register('code')} error={errors.code?.message} placeholder="SKIGNAS20" className="uppercase" />
            <Select label="Type" {...register('type')} options={[
              { value: 'percent', label: 'Pourcentage (%)' },
              { value: 'fixed',   label: 'Montant fixe (FCFA)' },
            ]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valeur (entrez % ou FCFA)" type="number" min={1} step={1} {...register('value')} error={errors.value?.message} placeholder="20 ou 5000" />
            <Input label="Commande min. (FCFA, 0 = aucune)" type="number" min={0} step={1} {...register('minOrder')} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nb max d'utilisations" type="number" {...register('maxUses')} placeholder="Illimité" />
            <Input label="Date d'expiration" type="date" {...register('expiresAt')} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setOpen(false); reset() }}>Annuler</Button>
            <Button type="submit" loading={createMutation.isPending}>Créer le code</Button>
          </div>
        </form>
      </Modal>

      <Confirm
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        title="Supprimer ce code promo ?"
        message="Le code sera définitivement supprimé."
      />
    </div>
  )
}
