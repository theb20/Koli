import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField, SelectField } from '@/components/ui/FormField'
import { fmtFcfa } from '@/lib/format'
import type { PayoutMethod } from '@/types'

const schema = (max: number) =>
  z.object({
    methodId: z.string().min(1, 'Choisissez un moyen de versement'),
    amount: z.coerce
      .number()
      .positive('Le montant doit être positif')
      .max(max, `Le montant ne peut pas dépasser ${fmtFcfa(max)}`),
  })

type WithdrawFormInput = z.input<ReturnType<typeof schema>>
type WithdrawFormValues = z.output<ReturnType<typeof schema>>

interface WithdrawModalProps {
  available: number
  methods: PayoutMethod[]
  onClose: () => void
  onSubmit: (values: WithdrawFormValues) => void
  isSubmitting?: boolean
}

export function WithdrawModal({ available, methods, onClose, onSubmit, isSubmitting }: WithdrawModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WithdrawFormInput, unknown, WithdrawFormValues>({
    resolver: zodResolver(schema(available)),
    defaultValues: { methodId: methods.find((m) => m.isDefault)?.id ?? methods[0]?.id ?? '' },
  })

  return (
    <Modal title="Retirer mes fonds" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <p className="text-sm text-[#6b6b68]">
          Solde disponible : <span className="font-semibold text-[#0a0a0b]">{fmtFcfa(available)}</span>
        </p>

        <SelectField
          label="Moyen de versement"
          id="methodId"
          required
          options={methods.map((m) => ({ value: m.id, label: `${m.label} · ${m.maskedNumber}` }))}
          error={errors.methodId?.message}
          {...register('methodId')}
        />

        <TextField
          label="Montant (FCFA)"
          id="amount"
          type="number"
          min={0}
          max={available}
          required
          error={errors.amount?.message}
          {...register('amount')}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Confirmer le retrait
          </Button>
        </div>
      </form>
    </Modal>
  )
}
