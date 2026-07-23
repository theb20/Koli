import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField, SelectField } from '@/components/ui/FormField'
import { paymentMethodLabels } from '@/lib/statusMaps'
import type { PayoutMethod } from '@/types'

const schema = z.object({
  method: z.enum(['wave', 'orange_money', 'mtn_money']),
  number: z.string().min(8, 'Numéro invalide').max(20, 'Numéro invalide'),
  isDefault: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface AddPayoutMethodModalProps {
  onClose: () => void
  onSubmit: (input: Omit<PayoutMethod, 'id'>) => void
  isSubmitting?: boolean
}

export function AddPayoutMethodModal({ onClose, onSubmit, isSubmitting }: AddPayoutMethodModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { method: 'wave', number: '', isDefault: false },
  })

  const submit = (values: FormValues) => {
    onSubmit({
      method: values.method,
      label: paymentMethodLabels[values.method],
      maskedNumber: `•••• ${values.number.slice(-4)}`,
      isDefault: values.isDefault,
    })
  }

  return (
    <Modal title="Ajouter un moyen de versement" onClose={onClose}>
      <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
        <SelectField
          label="Opérateur"
          id="method"
          options={[
            { value: 'wave', label: 'Wave' },
            { value: 'orange_money', label: 'Orange Money' },
            { value: 'mtn_money', label: 'MTN Money' },
          ]}
          {...register('method')}
        />
        <TextField label="Numéro de téléphone" id="number" required error={errors.number?.message} {...register('number')} />
        <label className="flex items-center gap-2 text-sm text-[#0a0a0b]">
          <input type="checkbox" className="rounded border-[#e8e8e4]" {...register('isDefault')} />
          Définir comme moyen par défaut
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Ajouter
          </Button>
        </div>
      </form>
    </Modal>
  )
}
