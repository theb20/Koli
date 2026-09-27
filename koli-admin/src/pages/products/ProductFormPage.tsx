import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus, Trash2, Save, Zap, X, Wrench, Truck, AlertTriangle } from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input, Textarea, Select } from '../../components/ui/Input'
import { toDatetimeLocal, fromDatetimeLocal, getSaleState, SALE_STATE_BADGE } from '../../lib/saleWindow'
import type { Category } from '../../types'
import { formatFCFA } from '../../lib/format'

/* ── Schéma — les prix sont en F CFA (entiers), on ×100 avant envoi ── */
const schema = z.object({
  name:        z.string().min(3, 'Minimum 3 caractères'),
  brand:       z.string().min(1, 'Requis'),
  category:    z.string().min(1, 'Catégorie requise'),
  price:       z.coerce.number().int('Entier requis').positive('Prix requis').min(1, 'Min 1 F CFA'),
  oldPrice:    z.coerce.number().int().positive().optional().or(z.literal('')),
  badge:       z.enum(['hot', 'new', 'sale', 'top', '']).optional(),
  stock:       z.coerce.number().int().nonnegative(),
  isNew:       z.boolean(),
  description: z.string().optional(),
  images:      z.array(z.object({ url: z.string().url('URL invalide') })).min(1, 'Au moins 1 image'),
  specs:       z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })),
  /* Promo programmée (Deals du jour / vente flash) */
  salePrice:    z.coerce.number().int().positive().optional().or(z.literal('')),
  saleStartsAt: z.string().optional(),
  saleEndsAt:   z.string().optional(),
  /* Option payante "Assistance technique" — prix fixe par ligne de commande */
  assistanceEnabled: z.boolean(),
  assistancePrice:   z.coerce.number().int('Entier requis').positive('Prix invalide').optional().or(z.literal('')),
  /* Approvisionnement (admin uniquement) — '' = aucun fournisseur / prix non renseigné */
  supplierId:    z.string(),
  // '' testé EN PREMIER : z.coerce.number() transformerait un champ vide en 0 (« gratuit »)
  supplierPrice: z.union([z.literal(''), z.coerce.number().int('Entier requis').nonnegative('Prix invalide')]),
}).refine(
  d => !(d.assistanceEnabled && !d.assistancePrice),
  { message: "Un prix est requis pour activer l'assistance technique", path: ['assistancePrice'] },
).refine(
  d => !(d.salePrice && !d.saleEndsAt),
  { message: 'Une date de fin est requise pour programmer un prix promo', path: ['saleEndsAt'] },
).refine(
  d => !(d.saleStartsAt && d.saleEndsAt && d.saleStartsAt >= d.saleEndsAt),
  { message: 'La date de fin doit être après la date de début', path: ['saleEndsAt'] },
)

type FormData = z.infer<typeof schema>

type SupplierOption = { id: number; name: string; mode: 'MARGIN' | 'COMMISSION'; commissionRate: number | null; isActive: boolean }
type ProductSourcing = {
  supplierId: number | null
  supplierPrice: number | null
  merchantStore: { id: number; name: string } | null
  mode: 'MARGIN' | 'COMMISSION'
  /** Calculé par l'API (backend/src/lib/finance) — aucune formule ici */
  pricing: { sellingPriceHt: number; sellingPrice: number; vat: number; margin: number | null; marginRate: number | null }
}

/** Prix par défaut de l'option "Assistance technique" (même valeur que le défaut en base) */
const DEFAULT_ASSISTANCE_PRICE = 10_000

const BADGES = [
  { value: '', label: 'Aucun badge' }, { value: 'hot', label: 'Hot 🔥' },
  { value: 'new', label: 'Nouveau ✨' }, { value: 'sale', label: 'Promo 💰' },
  { value: 'top', label: 'Top ⭐' },
]

function fmtPreview(raw: string | number) {
  const n = Number(raw)
  if (!n || n <= 0) return null
  return formatFCFA(n)
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

  /* Fournisseur + prix d'achat + marge actuelle — route admin séparée (jamais dans GET /api/products/:id, public) */
  const { data: sourcing } = useQuery({
    queryKey: ['product-sourcing', id],
    queryFn: async () => (await api.get(`/api/products/${id}/sourcing`)).data.data as ProductSourcing,
    enabled: isEdit,
  })
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get('/api/admin/suppliers')).data.data.suppliers as SupplierOption[],
    staleTime: 60_000,
  })
  const isMerchantProduct = !!sourcing?.merchantStore

  const { register, control, handleSubmit, reset, watch, setValue, getValues, setError, formState: { errors, dirtyFields } } = useForm<FormData>({
    resolver: zodResolver(schema) as import('react-hook-form').Resolver<FormData>,
    defaultValues: { images: [{ url: '' }], specs: [], isNew: false, stock: 100, category: '', assistanceEnabled: false, assistancePrice: DEFAULT_ASSISTANCE_PRICE, supplierId: '', supplierPrice: '' },
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
        salePrice:    existing.salePrice ?? '',
        saleStartsAt: toDatetimeLocal(existing.saleStartsAt),
        saleEndsAt:   toDatetimeLocal(existing.saleEndsAt),
        assistanceEnabled: existing.assistanceEnabled ?? false,
        assistancePrice:   existing.assistancePrice ?? DEFAULT_ASSISTANCE_PRICE,
        supplierId:    sourcing?.supplierId != null ? String(sourcing.supplierId) : '',
        supplierPrice: sourcing?.supplierPrice ?? '',
      })
    }
  }, [existing, sourcing, reset])

  const mutation = useMutation({
    mutationFn: (body: object) => isEdit
      ? api.put(`/api/products/${id}`, body)
      : api.post('/api/products', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['product-sourcing', id] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      navigate('/products')
    },
  })

  const onSubmit = ({ supplierId, supplierPrice, ...data }: FormData) => {
    const supplierMode = suppliers.find(s => String(s.id) === supplierId)?.mode ?? 'MARGIN'
    // Prix d'achat exigé à la création (mode marge) ; en édition, seulement si
    // l'approvisionnement est modifié — un produit en attente de backfill reste
    // éditable pour le reste.
    const sourcingTouched = !isEdit || !!dirtyFields.supplierId || !!dirtyFields.supplierPrice
    if (!isMerchantProduct && sourcingTouched && supplierMode === 'MARGIN' && supplierPrice === '') {
      setError('supplierPrice', { message: "Prix d'achat requis (fournisseur en mode marge)" })
      return
    }
    // Champs d'approvisionnement retirés de `data` (valeurs brutes du
    // formulaire) et envoyés convertis, seulement s'ils ont changé.
    mutation.mutate({
      ...data,
      ...(!isMerchantProduct && sourcingTouched ? {
        supplierId:    supplierId ? Number(supplierId) : null,
        supplierPrice: supplierPrice === '' ? null : Number(supplierPrice),
      } : {}),
      price:    Number(data.price),
      oldPrice: data.oldPrice ? Number(data.oldPrice) : undefined,
      badge:    data.badge || undefined,
      images:   data.images.map(i => i.url),
      specs:    data.specs,
      salePrice:    data.salePrice ? Number(data.salePrice) : null,
      saleStartsAt: fromDatetimeLocal(data.saleStartsAt),
      saleEndsAt:   fromDatetimeLocal(data.saleEndsAt),
      assistanceEnabled: data.assistanceEnabled,
      // Prix conservé même désactivé, pour pouvoir réactiver sans le ressaisir
      assistancePrice:   data.assistancePrice ? Number(data.assistancePrice) : null,
    })
  }

  const clearSale = () => {
    setValue('salePrice', '')
    setValue('saleStartsAt', '')
    setValue('saleEndsAt', '')
  }

  const watchedImages   = watch('images')
  const watchSalePrice  = watch('salePrice')
  const watchSaleStarts = watch('saleStartsAt')
  const watchSaleEnds   = watch('saleEndsAt')
  const saleState = getSaleState(watchSaleStarts, watchSaleEnds)
  const watchAssistance = watch('assistanceEnabled')
  // Activation avec un prix vidé → on remet le prix par défaut (seulement au
  // moment où l'on coche, pour ne pas gêner la saisie d'un autre montant)
  useEffect(() => {
    if (watchAssistance && !getValues('assistancePrice')) setValue('assistancePrice', DEFAULT_ASSISTANCE_PRICE)
  }, [watchAssistance, getValues, setValue])
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nom du produit" {...register('name')} error={errors.name?.message} placeholder="Ex: iPhone 15 Pro" />
            <Input label="Marque" {...register('brand')} error={errors.brand?.message} placeholder="Ex: Apple" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Prix */}
            <div className="space-y-1">
              <Input
                label="Prix de vente HT (F CFA)"
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

        {/* Approvisionnement — fournisseur et prix d'achat (base du calcul des marges) */}
        <div className={cardCls}>
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Truck size={15} className="text-slate-500" /> Approvisionnement
          </h3>
          {isMerchantProduct ? (
            <p className="text-sm text-slate-500">
              Produit de la boutique marchande <strong className="text-slate-700">{sourcing!.merchantStore!.name}</strong> : Skignas perçoit la commission
              du marchand (menu Marchands), aucun prix d'achat à saisir.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Fournisseur" {...register('supplierId')}
                  options={[{ value: '', label: 'Aucun (stock Skignas, mode marge)' },
                    ...suppliers.filter(s => s.isActive || String(s.id) === String(sourcing?.supplierId ?? ''))
                      .map(s => ({ value: String(s.id), label: `${s.name} — ${s.mode === 'COMMISSION' ? `commission ${s.commissionRate ?? '?'} %` : 'marge'}` }))]} />
                <div className="space-y-1">
                  <Input label="Prix d'achat fournisseur HT (F CFA)" type="number" min={0} step={1}
                    {...register('supplierPrice')} error={errors.supplierPrice?.message} placeholder="12000" />
                  {fmtPreview(watch('supplierPrice') as string | number) && (
                    <p className="text-xs text-slate-500 font-medium pl-1">→ {fmtPreview(watch('supplierPrice') as string | number)}</p>
                  )}
                </div>
              </div>
              {isEdit && sourcing && (
                sourcing.pricing.margin == null && sourcing.mode === 'MARGIN' ? (
                  <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    Prix d'achat non renseigné : les ventes de ce produit sont exclues des calculs de marge.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Au prix enregistré : prix public TTC {formatFCFA(sourcing.pricing.sellingPrice)}
                    {sourcing.pricing.margin != null && <> · marge HT {formatFCFA(sourcing.pricing.margin)} ({sourcing.pricing.marginRate} %)</>}
                    {sourcing.mode === 'COMMISSION' && ' · rémunération à la commission'}.
                    {' '}Les commandes déjà payées gardent les valeurs figées au paiement.
                  </p>
                )
              )}
            </>
          )}
        </div>

        {/* Vente flash / Deal du jour */}
        <div className={cardCls}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Zap size={15} className="text-orange-500" /> Vente flash / Deal du jour
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {saleState !== 'none' && (
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${SALE_STATE_BADGE[saleState].cls}`}>
                  {SALE_STATE_BADGE[saleState].label}
                </span>
              )}
              {(watchSalePrice || watchSaleStarts || watchSaleEnds) && (
                <button type="button" onClick={clearSale}
                  className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600 transition-colors">
                  <X size={12} /> Retirer la promo
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Programmez un prix promo temporaire — le produit apparaît automatiquement dans les Deals du jour et ventes flash du site pendant cette période, puis revient au prix normal.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Prix promo (F CFA)"
              type="number"
              min={1}
              step={1}
              {...register('salePrice')}
              error={errors.salePrice?.message}
              placeholder="4500"
            />
            <Input
              label="Début (optionnel — immédiat si vide)"
              type="datetime-local"
              {...register('saleStartsAt')}
              error={errors.saleStartsAt?.message}
            />
            <Input
              label="Fin"
              type="datetime-local"
              {...register('saleEndsAt')}
              error={errors.saleEndsAt?.message}
            />
          </div>
        </div>

        {/* Option payante : Assistance technique */}
        <div className={cardCls}>
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Wrench size={15} className="text-indigo-500" /> Assistance technique
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('assistanceEnabled')} className="w-4 h-4 rounded accent-indigo-600" />
              <span className={`text-xs font-semibold ${watchAssistance ? 'text-emerald-600' : 'text-slate-400'}`}>
                {watchAssistance ? 'Activée' : 'Désactivée'}
              </span>
            </label>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Option payante proposée au client sur la fiche produit et dans le panier. Facturée une fois par commande de ce produit (quelle que soit la quantité), encaissée par la plateforme — jamais reversée au marchand.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Prix de l'assistance (F CFA)"
              type="number"
              min={1}
              step={1}
              {...register('assistancePrice')}
              error={errors.assistancePrice?.message}
              placeholder={String(DEFAULT_ASSISTANCE_PRICE)}
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
            <div key={f.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-start">
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
