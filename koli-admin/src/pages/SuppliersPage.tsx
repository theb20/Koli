import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Trash2, Truck, AlertTriangle } from 'lucide-react'
import { api } from '../lib/api'
import { formatNumber } from '../lib/format'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button, IconButton } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Modal, ConfirmDialog } from '../components/ui/Modal'
import { StatusPill } from '../components/ui/Badge'
import { CardSkeleton, EmptyState, ErrorState } from '../components/ui/States'

type Mode = 'MARGIN' | 'COMMISSION'
type Supplier = {
  id: number; name: string; contactName: string | null; phone: string | null; email: string | null
  mode: Mode; commissionRate: number | null; isActive: boolean; notes: string | null
  productCount: number; missingPriceCount: number
}

const MODE_LABEL: Record<Mode, string> = { MARGIN: 'Marge sur prix d\'achat', COMMISSION: 'Commission' }

const schema = z.object({
  name:           z.string().trim().min(2, 'Minimum 2 caractères'),
  contactName:    z.string().optional(),
  phone:          z.string().optional(),
  email:          z.string().email('E-mail invalide').optional().or(z.literal('')),
  mode:           z.enum(['MARGIN', 'COMMISSION']),
  commissionRate: z.coerce.number().min(0, '0 à 100').max(100, '0 à 100').optional().or(z.literal('')),
  isActive:       z.boolean(),
  notes:          z.string().optional(),
}).refine(d => d.mode !== 'COMMISSION' || d.commissionRate !== '', { message: 'Taux requis en mode commission', path: ['commissionRate'] })
type FormData = z.infer<typeof schema>

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur lors de l\'enregistrement'

export default function SuppliersPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Supplier | null>(null)

  const { data: suppliers, isLoading, isError, refetch } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get('/api/admin/suppliers')).data.data.suppliers as Supplier[],
  })

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as import('react-hook-form').Resolver<FormData>,
  })
  const mode = watch('mode')

  const save = useMutation({
    mutationFn: (d: FormData) => {
      const body = {
        name: d.name, contactName: d.contactName || null, phone: d.phone || null, email: d.email || null,
        mode: d.mode, commissionRate: d.mode === 'COMMISSION' && d.commissionRate !== '' ? Number(d.commissionRate) : null,
        isActive: d.isActive, notes: d.notes || null,
      }
      return editing && editing !== 'new' ? api.put(`/api/admin/suppliers/${editing.id}`, body) : api.post('/api/admin/suppliers', body)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setEditing(null) },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/suppliers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setDeleting(null) },
  })

  const open = (s: Supplier | 'new') => {
    save.reset()
    reset(s === 'new'
      ? { name: '', contactName: '', phone: '', email: '', mode: 'MARGIN', commissionRate: '', isActive: true, notes: '' }
      : { name: s.name, contactName: s.contactName ?? '', phone: s.phone ?? '', email: s.email ?? '', mode: s.mode, commissionRate: s.commissionRate ?? '', isActive: s.isActive, notes: s.notes ?? '' })
    setEditing(s)
  }

  const missing = (suppliers ?? []).reduce((n, s) => n + s.missingPriceCount, 0)

  return (
    <>
      <PageHeader title="Fournisseurs"
        subtitle="Fournisseurs du catalogue Skignas : mode de rémunération et prix d'achat servent au calcul des marges."
        cta={{ label: 'Nouveau fournisseur', onClick: () => open('new') }} />

      <div className="space-y-[18px]">
        <Card padded className="text-secondary text-ink-2 space-y-1.5">
          <p><strong className="text-ink font-medium">Marge sur prix d'achat</strong> : Skignas achète au prix fournisseur HT et revend ; marge = prix de vente HT − prix d'achat HT (saisi sur chaque produit).</p>
          <p><strong className="text-ink font-medium">Commission</strong> : Skignas prélève le taux sur le prix de vente HT et reverse le reste au fournisseur.</p>
          <p className="text-muted">Un changement de mode ou de taux ne s'applique qu'aux commandes payées ensuite : les ventes passées gardent les valeurs figées au paiement. Les boutiques marchandes ont leur propre commission (menu Marchands).</p>
        </Card>

        {missing > 0 && (
          <div role="note" className="flex items-start gap-2.5 rounded-input border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-secondary text-amber-800">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
            <p>{formatNumber(missing)} produit{missing > 1 ? 's' : ''} rattaché{missing > 1 ? 's' : ''} à un fournisseur n'{missing > 1 ? 'ont' : 'a'} pas de prix d'achat : leurs ventes seront exclues des calculs de marge.</p>
          </div>
        )}

        {isLoading ? <CardSkeleton lines={4} />
          : isError ? <Card padded><ErrorState onRetry={() => refetch()} /></Card>
          : !suppliers?.length ? (
            <Card padded><EmptyState icon={<Truck size={22} />} title="Aucun fournisseur" text="Créez vos fournisseurs puis rattachez-les aux produits (fiche produit → Approvisionnement)."
              action={<Button size="sm" onClick={() => open('new')}>Nouveau fournisseur</Button>} /></Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-secondary">
                <thead>
                  <tr className="border-b border-line text-left text-caption text-muted">
                    <th className="px-4 py-3 font-medium">Fournisseur</th>
                    <th className="px-4 py-3 font-medium">Mode</th>
                    <th className="px-4 py-3 font-medium text-right">Produits</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map(s => (
                    <tr key={s.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{s.name} <span className="text-caption text-muted font-normal">#{s.id}</span></p>
                        {(s.contactName || s.phone || s.email) && <p className="text-caption text-muted">{[s.contactName, s.phone, s.email].filter(Boolean).join(' · ')}</p>}
                      </td>
                      <td className="px-4 py-3 text-ink-2 whitespace-nowrap">
                        {MODE_LABEL[s.mode]}{s.mode === 'COMMISSION' && s.commissionRate != null && ` · ${s.commissionRate} %`}
                      </td>
                      <td className="px-4 py-3 text-right tabular">
                        {formatNumber(s.productCount)}
                        {s.missingPriceCount > 0 && <p className="text-caption text-amber-800">{formatNumber(s.missingPriceCount)} sans prix d'achat</p>}
                      </td>
                      <td className="px-4 py-3"><StatusPill tone={s.isActive ? 'green' : 'gray'}>{s.isActive ? 'Actif' : 'Inactif'}</StatusPill></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <IconButton label={`Modifier ${s.name}`} icon={<Pencil size={15} />} onClick={() => open(s)} />
                          <IconButton label={`Supprimer ${s.name}`} icon={<Trash2 size={15} />} onClick={() => { remove.reset(); setDeleting(s) }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nouveau fournisseur' : 'Modifier le fournisseur'}>
        <form onSubmit={handleSubmit(d => save.mutate(d))} className="space-y-4">
          {save.isError && <p role="alert" className="text-secondary text-down">{errMsg(save.error)}</p>}
          <Input label="Nom" {...register('name')} error={errors.name?.message} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Contact (optionnel)" {...register('contactName')} />
            <Input label="Téléphone (optionnel)" {...register('phone')} />
          </div>
          <Input label="E-mail (optionnel)" type="email" {...register('email')} error={errors.email?.message} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Mode de rémunération" {...register('mode')}
              options={[{ value: 'MARGIN', label: MODE_LABEL.MARGIN }, { value: 'COMMISSION', label: MODE_LABEL.COMMISSION }]} />
            {mode === 'COMMISSION' && (
              <Input label="Commission Skignas (% du prix HT)" type="number" min={0} max={100} step={0.1}
                {...register('commissionRate')} error={errors.commissionRate?.message} />
            )}
          </div>
          <Textarea label="Notes (optionnel)" rows={3} {...register('notes')} />
          <label className="flex items-center gap-2 text-secondary text-ink-2">
            <input type="checkbox" {...register('isActive')} className="w-4 h-4 accent-[var(--primary)]" /> Fournisseur actif
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(null)}>Annuler</Button>
            <Button type="submit" size="sm" loading={save.isPending}>Enregistrer</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} loading={remove.isPending}
        title={`Supprimer « ${deleting?.name ?? ''} » ?`}
        message={remove.isError ? errMsg(remove.error) : 'Possible seulement sans produit ni vente rattachés — sinon, désactivez-le.'} />
    </>
  )
}
