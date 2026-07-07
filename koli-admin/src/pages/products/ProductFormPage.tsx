import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input, Textarea, Select } from '../../components/ui/Input'
import type { Category } from '../../types'

/* ── Schéma — les prix sont en FCFA (entiers), on ×100 avant envoi ── */
const schema = z.object({
  name:        z.string().min(3, 'Minimum 3 caractères'),
  brand:       z.string().min(1, 'Requis'),
  category:    z.string().min(1, 'Catégorie requise'),
  price:       z.coerce.number().int('Entier requis').positive('Prix requis').min(1, 'Min 1 FCFA'),
  oldPrice:    z.coerce.number().int().positive().optional().or(z.literal('')),
  badge:       z.enum(['hot', 'new', 'sale', 'top', '']).optional(),
  stock:       z.coerce.number().int().nonnegative(),
  isNew:       z.boolean(),
  description: z.string().optional(),
  images:      z.array(z.object({ url: z.string().url('URL invalide') })).min(1, 'Au moins 1 image'),
  specs:       z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })),
})

type FormData = z.infer<typeof schema>

const BADGES = [
  { value: '', label: 'Aucun badge' }, { value: 'hot', label: 'Hot 🔥' },
  { value: 'new', label: 'Nouveau ✨' }, { value: 'sale', label: 'Promo 💰' },
  { value: 'top', label: 'Top ⭐' },
]

function fmtPreview(raw: string | number) {
  const n = Number(raw)
  if (!n || n <= 0) return null
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'
}

export default function ProductFormPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const qc        = useQueryClient()
  const isEdit    = !!id

  /* Catégories dynamiques */
  const { data: catData } = useQuery({
    queryKey: ['categories-admin'],
    queryFn: async () => { const { data } = await api.get('/api/categories/admin'); return data.data as Category[] },
    staleTime: 5 * 60 * 1000,
  })
  const CATEGORIES = (catData ?? []).map(c => ({ value: c.slug, label: c.name }))

  const { data: existing } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => { const { data } = await api.get(`/api/products/${id}`); return data.data.product },
    enabled: isEdit,
  })

  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as import('react-hook-form').Resolver<FormData>,
    defaultValues: { images: [{ url: '' }], specs: [], isNew: false, stock: 100, category: '' },
  })

  const { fields: imgFields, append: appendImg, remove: removeImg } = useFieldArray({ control, name: 'images' })
  const { fields: specFields, append: appendSpec, remove: removeSpec } = useFieldArray({ control, name: 'specs' })

  useEffect(() => {
    if (existing) {
      reset({
        name:        existing.name,
        brand:       existing.brand,
        category:    existing.category,
        price:       existing.price,
        oldPrice:    existing.oldPrice ?? '',
        badge:       existing.badge ?? '',
        stock:       existing.stock,
        isNew:       existing.isNew,
        description: existing.description ?? '',
        images:      existing.images.map((i: { url: string }) => ({ url: i.url })),
        specs:       existing.specs.map((s: { label: string; value: string }) => ({ label: s.label, value: s.value })),
      })
    }
  }, [existing, reset])

  const mutation = useMutation({
    mutationFn: (body: object) => isEdit
      ? api.put(`/api/products/${id}`, body)
      : api.post('/api/products', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); navigate('/products') },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      ...data,
      price:    Number(data.price),
      oldPrice: data.oldPrice ? Number(data.oldPrice) : undefined,
      badge:    data.badge || undefined,
      images:   data.images.map(i => i.url),
      specs:    data.specs,
    })
  }

  const watchedImages = watch('images')
  const watchPrice    = watch('price')
  const watchOldPrice = watch('oldPrice')

  const cardCls = "bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4"

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/products')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{isEdit ? 'Modifier le produit' : 'Nouveau produit'}</h1>
          <p className="text-sm text-slate-500">{isEdit ? `ID #${id}` : 'Remplissez les informations du produit'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
            {(mutation.error as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Erreur lors de l'enregistrement"}
          </div>
        )}

        {/* Infos de base */}
        <div className={cardCls}>
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Informations générales</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nom du produit" {...register('name')} error={errors.name?.message} placeholder="Ex: iPhone 15 Pro" />
            <Input label="Marque" {...register('brand')} error={errors.brand?.message} placeholder="Ex: Apple" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Catégorie"
              {...register('category')}
              options={CATEGORIES.length ? CATEGORIES : [{ value: '', label: 'Chargement…' }]}
              error={errors.category?.message}
            />
            <Select label="Badge" {...register('badge')} options={BADGES} />
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input type="checkbox" {...register('isNew')} className="w-4 h-4 rounded accent-indigo-600" />
                <span className="text-sm text-slate-600">Marquer comme nouveau</span>
              </label>
            </div>
          </div>
          <Textarea label="Description" {...register('description')} rows={4} placeholder="Description détaillée du produit..." />
        </div>

        {/* Prix & stock */}
        <div className={cardCls}>
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Prix & Stock</h3>
          <div className="grid grid-cols-3 gap-4">

            {/* Prix */}
            <div className="space-y-1">
              <Input
                label="Prix de vente (FCFA)"
                type="number"
                min={1}
                step={1}
                {...register('price')}
                error={errors.price?.message}
                placeholder="5500"
              />
              {fmtPreview(watchPrice) && (
                <p className="text-xs text-indigo-600 font-medium pl-1">
                  → {fmtPreview(watchPrice)}
                </p>
              )}
            </div>

            {/* Ancien prix */}
            <div className="space-y-1">
              <Input
                label="Ancien prix (optionnel)"
                type="number"
                min={1}
                step={1}
                {...register('oldPrice')}
                error={errors.oldPrice?.message}
                placeholder="7000"
              />
              {fmtPreview(watchOldPrice as string | number) && (
                <p className="text-xs text-slate-400 font-medium pl-1 line-through">
                  {fmtPreview(watchOldPrice as string | number)}
                </p>
              )}
            </div>

            <Input
              label="Stock"
              type="number"
              min={0}
              step={1}
              {...register('stock')}
              error={errors.stock?.message}
              placeholder="100"
            />
          </div>
        </div>

        {/* Images */}
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-800">Images (URLs)</h3>
            <Button type="button" variant="secondary" size="xs" icon={<Plus size={12} />} onClick={() => appendImg({ url: '' })}>
              Ajouter
            </Button>
          </div>
          {errors.images?.root && <p className="text-xs text-red-500">{errors.images.root.message}</p>}
          {imgFields.map((f, i) => (
            <div key={f.id} className="flex gap-2 items-start">
              <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0 mt-1">
                {watchedImages[i]?.url && (
                  <img src={watchedImages[i].url} alt="" className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                )}
              </div>
              <Input
                className="flex-1"
                {...register(`images.${i}.url`)}
                placeholder={`Image ${i + 1} — https://...`}
                error={errors.images?.[i]?.url?.message}
              />
              {imgFields.length > 1 && (
                <button type="button" onClick={() => removeImg(i)} className="p-2 mt-1 text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Specs */}
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-800">Spécifications techniques</h3>
            <Button type="button" variant="secondary" size="xs" icon={<Plus size={12} />} onClick={() => appendSpec({ label: '', value: '' })}>
              Ajouter
            </Button>
          </div>
          {specFields.length === 0 && <p className="text-xs text-slate-400">Aucune spec ajoutée</p>}
          {specFields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
              <Input {...register(`specs.${i}.label`)} placeholder="Ex: Processeur" error={errors.specs?.[i]?.label?.message} />
              <Input {...register(`specs.${i}.value`)} placeholder="Ex: Apple M3" error={errors.specs?.[i]?.value?.message} />
              <button type="button" onClick={() => removeSpec(i)} className="p-2 mt-2 text-red-400 hover:text-red-600 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={() => navigate('/products')}>Annuler</Button>
          <Button type="submit" loading={mutation.isPending} icon={<Save size={15} />}>
            {isEdit ? 'Enregistrer les modifications' : 'Créer le produit'}
          </Button>
        </div>
      </form>
    </div>
  )
}
