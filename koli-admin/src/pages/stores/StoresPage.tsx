import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Store, Edit, Trash2, ExternalLink, Package, ToggleLeft, ToggleRight, Image,
  Search, MapPin, Phone, Mail, CheckCircle2, XCircle,
} from 'lucide-react'
import { api, fmtDate } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal, Confirm } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { StatCard } from '../../components/ui/Card'
import { PageTitle } from '../../components/layout/Sidebar'

type StoreData = {
  id: number
  name: string
  logo?: string
  description?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  isActive: boolean
  lastImportAt?: string
  createdAt: string
  _count: { products: number }
}

const schema = z.object({
  name:        z.string().min(1, 'Requis'),
  logo:        z.string().url('URL invalide').optional().or(z.literal('')),
  description: z.string().optional(),
  address:     z.string().optional(),
  phone:       z.string().optional(),
  email:       z.string().email('Email invalide').optional().or(z.literal('')),
  website:     z.string().url('URL invalide').optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

async function fetchStores() {
  const { data } = await api.get('/api/stores/admin/all')
  return data.data.stores as StoreData[]
}

type StatusFilter = 'all' | 'active' | 'inactive'

export default function StoresPage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [open, setOpen]         = useState(false)
  const [editing, setEditing]   = useState<StoreData | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState<StatusFilter>('all')

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: fetchStores,
  })

  const filteredStores = useMemo(() => {
    return stores.filter(s => {
      if (status === 'active' && !s.isActive) return false
      if (status === 'inactive' && s.isActive) return false
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [stores, search, status])

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as import('react-hook-form').Resolver<FormData>,
  })

  const openCreate = () => { setEditing(null); reset({}); setOpen(true) }
  const openEdit   = (s: StoreData) => {
    setEditing(s)
    reset({ name: s.name, logo: s.logo ?? '', description: s.description ?? '', address: s.address ?? '', phone: s.phone ?? '', email: s.email ?? '', website: s.website ?? '' })
    setOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (body: FormData) => editing
      ? api.put(`/api/stores/${editing.id}`, body)
      : api.post('/api/stores', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stores'] }); setOpen(false); reset() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/stores/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stores'] }); setDeleteId(null) },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.put(`/api/stores/${id}`, { isActive: !isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stores'] }),
  })

  const totalProducts = stores.reduce((s, st) => s + st._count.products, 0)
  const activeCount   = stores.filter(s => s.isActive).length

  return (
    <div className="space-y-5">
      <PageTitle
        title="Magasins"
        sub={`${stores.length} magasin(s) · ${totalProducts} produits importés`}
        action={<Button icon={<Plus size={15} />} onClick={openCreate}>Nouveau magasin</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Magasins totaux" value={stores.length} icon={<Store size={18} />} />
        <StatCard title="Actifs" value={activeCount} icon={<CheckCircle2 size={18} />} color="green" />
        <StatCard title="Inactifs" value={stores.length - activeCount} icon={<XCircle size={18} />} color="rose" />
        <StatCard title="Produits importés" value={totalProducts} icon={<Package size={18} />} color="blue" />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un magasin..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all"
          />
        </div>
        <div className="flex gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
          {([
            { value: 'all',      label: 'Tous' },
            { value: 'active',   label: 'Actifs' },
            { value: 'inactive', label: 'Inactifs' },
          ] as const).map(o => (
            <button
              key={o.value}
              onClick={() => setStatus(o.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                status === o.value ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Store grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-56 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center shadow-sm">
          <Store size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Aucun magasin</p>
          <p className="text-slate-400 text-sm mt-1">Créez votre premier magasin pour importer des produits</p>
          <Button className="mt-4" icon={<Plus size={14} />} onClick={openCreate}>Créer un magasin</Button>
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center shadow-sm">
          <Search size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Aucun magasin ne correspond à ta recherche</p>
          <button onClick={() => { setSearch(''); setStatus('all') }} className="mt-2 text-indigo-600 text-sm font-medium hover:underline">
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStores.map(s => (
            <div key={s.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-200 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                    {s.logo
                      ? <img src={s.logo} alt={s.name} className="w-full h-full object-contain p-1" />
                      : <Store size={18} className="text-indigo-600" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{s.name}</p>
                    {s.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mt-0.5">{s.description}</p>
                    )}
                  </div>
                </div>
                <Badge label={s.isActive ? 'active' : 'inactive'} />
              </div>

              {/* Meta */}
              {(s.address || s.phone || s.email || s.website) && (
                <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                  {s.address && (
                    <p className="flex items-center gap-2 truncate">
                      <MapPin size={12} className="text-slate-400 shrink-0" /> <span className="truncate">{s.address}</span>
                    </p>
                  )}
                  {s.phone && (
                    <p className="flex items-center gap-2">
                      <Phone size={12} className="text-slate-400 shrink-0" /> {s.phone}
                    </p>
                  )}
                  {s.email && (
                    <p className="flex items-center gap-2 truncate">
                      <Mail size={12} className="text-slate-400 shrink-0" /> <span className="truncate">{s.email}</span>
                    </p>
                  )}
                  {s.website && (
                    <a href={s.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-indigo-600 hover:underline truncate">
                      <ExternalLink size={12} className="shrink-0" /> <span className="truncate">{s.website.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-sm">
                  <Package size={14} className="text-indigo-600" />
                  <span className="font-semibold text-slate-900">{s._count.products}</span>
                  <span className="text-slate-500">produit(s)</span>
                </div>
                {s.lastImportAt && (
                  <p className="text-xs text-slate-400 ml-auto">Import : {fmtDate(s.lastImportAt)}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-auto">
                <Button size="sm" className="flex-1" onClick={() => navigate(`/stores/${s.id}`)}>
                  Gérer
                </Button>
                <button onClick={() => openEdit(s)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all" title="Modifier">
                  <Edit size={15} />
                </button>
                <button onClick={() => toggleMutation.mutate({ id: s.id, isActive: s.isActive })}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all"
                  title={s.isActive ? 'Désactiver' : 'Activer'}>
                  {s.isActive ? <ToggleRight size={15} className="text-green-500" /> : <ToggleLeft size={15} />}
                </button>
                <button onClick={() => setDeleteId(s.id)}
                  className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all" title="Supprimer">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={open}
        onClose={() => { setOpen(false); reset() }}
        title={editing ? `Modifier — ${editing.name}` : 'Nouveau magasin'}
      >
        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
          {saveMutation.isError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-xl">
              Erreur lors de l'enregistrement
            </div>
          )}
          <Input label="Nom du magasin *" {...register('name')} error={errors.name?.message} placeholder="Ex: Boutique Centrale Yaoundé" />

          {/* Logo preview + URL field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Logo du magasin</label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 bg-slate-50">
                {watch('logo')
                  ? <img src={watch('logo')} alt="" className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  : <Image size={20} className="text-slate-300" />
                }
              </div>
              <input
                {...register('logo')}
                placeholder="https://example.com/logo.png"
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>
            {errors.logo && <p className="text-xs text-red-500 mt-1">{errors.logo.message}</p>}
          </div>

          <Input label="Description" {...register('description')} placeholder="Description courte du magasin" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Adresse" {...register('address')} placeholder="Rue, Quartier, Ville" />
            <Input label="Téléphone" {...register('phone')} placeholder="+237 6XX XXX XXX" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" {...register('email')} error={errors.email?.message} placeholder="contact@boutique.cm" />
            <Input label="Site web" {...register('website')} error={errors.website?.message} placeholder="https://..." />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => { setOpen(false); reset() }}>Annuler</Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editing ? 'Enregistrer' : 'Créer le magasin'}
            </Button>
          </div>
        </form>
      </Modal>

      <Confirm
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        title="Supprimer ce magasin ?"
        message="Les produits liés seront conservés mais dissociés du magasin."
      />
    </div>
  )
}
