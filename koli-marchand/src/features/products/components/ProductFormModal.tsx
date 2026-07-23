import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField, TextAreaField, SelectField } from '@/components/ui/FormField'
import { PRODUCT_CATEGORIES } from '@/mocks/data/products'
import type { Product, ProductInput } from '@/types'

const productSchema = z.object({
  name: z.string().min(3, '3 caractères minimum'),
  category: z.string().min(1, 'Choisissez une catégorie'),
  price: z.coerce.number().positive('Le prix doit être positif'),
  stock: z.coerce.number().int('Nombre entier requis').min(0, 'Le stock ne peut pas être négatif'),
  description: z.string().min(10, '10 caractères minimum'),
  imagesText: z.string().min(1, 'Ajoutez au moins une image (une URL par ligne)'),
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

const categoryOptions = PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))

export function ProductFormModal({ product, onClose, onSubmit, isSubmitting }: ProductFormModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? '',
      category: product?.category ?? PRODUCT_CATEGORIES[0],
      price: product?.price ?? 0,
      stock: product?.stock ?? 0,
      description: product?.description ?? '',
      imagesText: product?.images.join('\n') ?? '',
      status: product?.status ?? 'draft',
    },
  })

  const submit = (values: ProductFormValues) => {
    onSubmit({
      name: values.name,
      category: values.category,
      price: values.price,
      stock: values.stock,
      description: values.description,
      images: values.imagesText.split('\n').map((s) => s.trim()).filter(Boolean),
      status: values.status,
    })
  }

  return (
    <Modal title={product ? 'Modifier le produit' : 'Ajouter un produit'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
        <TextField label="Nom du produit" id="name" required error={errors.name?.message} {...register('name')} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SelectField
            label="Catégorie"
            id="category"
            required
            options={categoryOptions}
            error={errors.category?.message}
            {...register('category')}
          />
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

        <TextAreaField
          label="Images (une URL par ligne)"
          id="imagesText"
          rows={2}
          required
          placeholder="https://exemple.com/photo1.jpg"
          error={errors.imagesText?.message}
          {...register('imagesText')}
        />

        <SelectField label="Statut" id="status" options={statusOptions} {...register('status')} />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {product ? 'Enregistrer' : 'Créer le produit'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
