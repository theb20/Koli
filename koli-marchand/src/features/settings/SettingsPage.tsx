import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextField, TextAreaField } from '@/components/ui/FormField'
import { paymentMethodLabels } from '@/lib/statusMaps'
import { useAddPayoutMethod, useDeletePayoutMethod, useSettings, useUpdateSettings } from './api/useSettings'
import { AddPayoutMethodModal } from './components/AddPayoutMethodModal'

const shopSchema = z.object({
  name: z.string().min(2, '2 caractères minimum'),
  description: z.string().min(10, '10 caractères minimum'),
  email: z.string().email('E-mail invalide'),
  phone: z.string().min(8, 'Numéro invalide'),
})

type ShopFormValues = z.infer<typeof shopSchema>

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()
  const addPayoutMethod = useAddPayoutMethod()
  const deletePayoutMethod = useDeletePayoutMethod()
  const [addMethodOpen, setAddMethodOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ShopFormValues>({
    resolver: zodResolver(shopSchema),
    values: settings
      ? { name: settings.name, description: settings.description, email: settings.email, phone: settings.phone }
      : undefined,
  })

  if (isLoading || !settings) return <p className="text-sm text-[#6b6b68]">Chargement…</p>

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Gérez les informations et les moyens de versement de votre boutique" />

      <Card className="p-6 mb-6">
        <h2 className="font-bold text-[#0a0a0b] mb-4">Informations de la boutique</h2>
        <form
          onSubmit={handleSubmit((values) => updateSettings.mutate(values, { onSuccess: () => reset(values) }))}
          noValidate
          className="space-y-4"
        >
          <TextField label="Nom de la boutique" id="shop-name" required error={errors.name?.message} {...register('name')} />
          <TextAreaField label="Description" id="shop-description" rows={3} required error={errors.description?.message} {...register('description')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="E-mail" id="shop-email" type="email" required error={errors.email?.message} {...register('email')} />
            <TextField label="Téléphone" id="shop-phone" required error={errors.phone?.message} {...register('phone')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => reset()} disabled={!isDirty}>
              Annuler
            </Button>
            <Button type="submit" isLoading={updateSettings.isPending} disabled={!isDirty}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#0a0a0b]">Versements</h2>
          <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setAddMethodOpen(true)}>
            Ajouter un moyen
          </Button>
        </div>
        <ul className="space-y-2">
          {settings.payoutMethods.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-xl border border-[#e8e8e4] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#0a0a0b]">
                  {paymentMethodLabels[m.method]} · {m.maskedNumber}
                </p>
                {m.isDefault && <p className="text-xs text-[#1E90FF] font-semibold mt-0.5">Par défaut</p>}
              </div>
              <button
                onClick={() => deletePayoutMethod.mutate(m.id)}
                aria-label={`Supprimer ${m.label}`}
                className="p-1.5 rounded-lg text-[#6b6b68] hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
          {settings.payoutMethods.length === 0 && (
            <p className="text-sm text-[#6b6b68]">Aucun moyen de versement enregistré.</p>
          )}
        </ul>
      </Card>

      {addMethodOpen && (
        <AddPayoutMethodModal
          onClose={() => setAddMethodOpen(false)}
          isSubmitting={addPayoutMethod.isPending}
          onSubmit={(input) => addPayoutMethod.mutate(input, { onSuccess: () => setAddMethodOpen(false) })}
        />
      )}
    </div>
  )
}
