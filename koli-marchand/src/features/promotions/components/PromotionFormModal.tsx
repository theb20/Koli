import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField, TextAreaField, SelectField } from '@/components/ui/FormField'
import type { Promotion, PromotionInput } from '@/types'

const promotionSchema = z
  .object({
    code: z.string().min(3, '3 caractères minimum').transform((v) => v.toUpperCase()),
    type: z.enum(['percentage', 'fixed_amount']),
    value: z.coerce.number().positive('La valeur doit être positive'),
    description: z.string().min(5, '5 caractères minimum'),
    startDate: z.string().min(1, 'Date de début requise'),
    endDate: z.string().min(1, 'Date de fin requise'),
    usageLimit: z.string(),
    minPurchase: z.string(),
  })
  .refine((v) => new Date(v.endDate) > new Date(v.startDate), {
    message: 'La date de fin doit être postérieure à la date de début',
    path: ['endDate'],
  })
  .refine((v) => v.type !== 'percentage' || v.value <= 100, {
    message: 'Un pourcentage ne peut pas dépasser 100',
    path: ['value'],
  })

type PromotionFormInput = z.input<typeof promotionSchema>
type PromotionFormValues = z.output<typeof promotionSchema>

interface PromotionFormModalProps {
  promotion?: Promotion
  onClose: () => void
  onSubmit: (input: PromotionInput) => void
  isSubmitting?: boolean
}

const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : '')

export function PromotionFormModal({ promotion, onClose, onSubmit, isSubmitting }: PromotionFormModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PromotionFormInput, unknown, PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      code: promotion?.code ?? '',
      type: promotion?.type ?? 'percentage',
      value: promotion?.value ?? 10,
      description: promotion?.description ?? '',
      startDate: toDateInput(promotion?.startDate) || toDateInput(new Date().toISOString()),
      endDate: toDateInput(promotion?.endDate),
      usageLimit: promotion?.usageLimit ? String(promotion.usageLimit) : '',
      minPurchase: promotion?.minPurchase ? String(promotion.minPurchase) : '',
    },
  })

  const type = watch('type')

  const submit = (values: PromotionFormValues) => {
    onSubmit({
      code: values.code,
      type: values.type,
      value: values.value,
      description: values.description,
      startDate: new Date(values.startDate).toISOString(),
      endDate: new Date(values.endDate).toISOString(),
      usageLimit: values.usageLimit ? Number(values.usageLimit) : null,
      minPurchase: values.minPurchase ? Number(values.minPurchase) : null,
    })
  }

  return (
    <Modal title={promotion ? 'Modifier la promotion' : 'Créer une promotion'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Code promo" id="code" required error={errors.code?.message} {...register('code')} />
          <SelectField
            label="Type de remise"
            id="type"
            options={[
              { value: 'percentage', label: 'Pourcentage (%)' },
              { value: 'fixed_amount', label: 'Montant fixe (FCFA)' },
            ]}
            {...register('type')}
          />
        </div>

        <TextField
          label={type === 'percentage' ? 'Valeur (%)' : 'Valeur (FCFA)'}
          id="value"
          type="number"
          min={0}
          required
          error={errors.value?.message}
          {...register('value')}
        />

        <TextAreaField
          label="Description"
          id="description"
          rows={2}
          required
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Date de début" id="startDate" type="date" required error={errors.startDate?.message} {...register('startDate')} />
          <TextField label="Date de fin" id="endDate" type="date" required error={errors.endDate?.message} {...register('endDate')} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Limite d'utilisation" id="usageLimit" type="number" min={0} placeholder="Illimité" {...register('usageLimit')} />
          <TextField label="Achat minimum (FCFA)" id="minPurchase" type="number" min={0} placeholder="Aucun" {...register('minPurchase')} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {promotion ? 'Enregistrer' : 'Créer la promotion'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
