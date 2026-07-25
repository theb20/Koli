import { useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField, TextAreaField, SelectField } from '@/components/ui/FormField'
import { useCategories } from '@/features/categories/api/useCategories'
import { useUploadProductImage } from '../api/useProducts'
import type { Product, ProductImage, ProductInput } from '@/types'

const productSchema = z.object({
  name: z.string().min(3, '3 caractères minimum'),
  brand: z.string().optional(),
  category: z.string().min(1, 'Choisissez une catégorie'),
  price: z.coerce.number().positive('Le prix doit être positif'),
  compareAtPrice: z.coerce.number().positive().optional().or(z.literal('')),
  stock: z.coerce.number().int('Nombre entier requis').min(0, 'Le stock ne peut pas être négatif'),
  description: z.string().min(10, '10 caractères minimum'),
  status: z.enum(['online', 'draft', 'out_of_stock']),
})

type ProductFormInput = z.input<typeof productSchema>
type ProductFormValues = z.output<typeof productSchema>

interface ProductFormModalProps {
  product?: Product
  onClose: () => void
  onSubmit: (input: ProductInput) => void
  isSubmitting?: boolean
}

const statusOptions = [
  { value: 'online', label: 'En ligne' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'out_of_stock', label: 'Rupture de stock' },
]

const MAX_IMAGES = 10

export function ProductFormModal({ product, onClose, onSubmit, isSubmitting }: ProductFormModalProps) {
  const { data: categories, isLoading: categoriesLoading } = useCategories()
  const categoryOptions = (categories ?? []).map((c) => ({ value: c.slug, label: c.name }))

  const [images, setImages] = useState<ProductImage[]>(product?.images ?? [])
  const [imagesError, setImagesError] = useState<string | null>(null)
  const [uploadingCount, setUploadingCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadImage = useUploadProductImage()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    values: {
      name: product?.name ?? '',
      brand: product?.brand ?? '',
      category: product?.category ?? '',
      price: product?.price ?? 0,
      compareAtPrice: product?.compareAtPrice ?? '',
      stock: product?.stock ?? 0,
      description: product?.description ?? '',
      status: product?.status ?? 'draft',
    },
  })

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const remaining = MAX_IMAGES - images.length
    const selected = Array.from(files).slice(0, remaining)
    setImagesError(null)
    setUploadingCount((n) => n + selected.length)
    for (const file of selected) {
      try {
        const uploaded = await uploadImage.mutateAsync(file)
        setImages((prev) => [...prev, uploaded])
      } catch {
        setImagesError(`Échec de l'envoi de "${file.name}"`)
      } finally {
        setUploadingCount((n) => n - 1)
      }
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const submit = (values: ProductFormValues) => {
    if (images.length === 0) {
      setImagesError('Ajoutez au moins une photo')
      return
    }
    onSubmit({
      name: values.name,
      brand: values.brand || undefined,
      category: values.category,
      price: values.price,
      compareAtPrice: values.compareAtPrice === '' ? undefined : values.compareAtPrice,
      stock: values.stock,
      description: values.description,
      images,
      status: values.status,
    })
  }

  return (
    <Modal title={product ? 'Modifier le produit' : 'Ajouter un produit'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Nom du produit" id="name" required error={errors.name?.message} {...register('name')} />
          <TextField label="Marque" id="brand" placeholder="Ex : Samsung" error={errors.brand?.message} {...register('brand')} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="Catégorie"
            id="category"
            required
            disabled={categoriesLoading}
            options={categoriesLoading ? [{ value: '', label: 'Chargement…' }] : categoryOptions}
            error={errors.category?.message}
            {...register('category')}
          />
          <SelectField label="Statut" id="status" options={statusOptions} {...register('status')} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TextField
            label="Prix (FCFA)"
            id="price"
            type="number"
            min={0}
            required
            error={errors.price?.message}
            {...register('price')}
          />
          <TextField
            label="Prix barré (FCFA)"
            id="compareAtPrice"
            type="number"
            min={0}
            placeholder="Optionnel"
            error={errors.compareAtPrice?.message}
            {...register('compareAtPrice')}
          />
          <TextField
            label="Stock"
            id="stock"
            type="number"
            min={0}
            required
            error={errors.stock?.message}
            {...register('stock')}
          />
        </div>

        <TextAreaField
          label="Description"
          id="description"
          rows={3}
          required
          error={errors.description?.message}
          {...register('description')}
        />

        <div>
          <label className="block text-sm font-medium text-[#0a0a0b] mb-1.5">
            Photos <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {images.map((img, i) => (
              <div key={img.url} className="relative aspect-square rounded-xl overflow-hidden bg-[#f5f5f3] border border-[#e8e8e4] group">
                <img src={img.thumbnailUrl || img.url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  aria-label="Retirer cette photo"
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            {Array.from({ length: uploadingCount }).map((_, i) => (
              <div key={`uploading-${i}`} className="aspect-square rounded-xl bg-[#f5f5f3] border border-[#e8e8e4] flex items-center justify-center">
                <Loader2 size={18} className="animate-spin text-[#a3a3a1]" />
              </div>
            ))}
            {images.length + uploadingCount < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-[#e8e8e4] hover:border-[#1E90FF]/40 flex flex-col items-center justify-center gap-1 text-[#a3a3a1] hover:text-[#1E90FF] transition-colors"
              >
                <ImagePlus size={18} />
                <span className="text-[10px] font-medium">Ajouter</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { void handleFiles(e.target.files); e.target.value = '' }}
          />
          {imagesError && <p className="text-xs text-rose-600 mt-1.5">{imagesError}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={uploadingCount > 0}>
            {product ? 'Enregistrer' : 'Créer le produit'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
