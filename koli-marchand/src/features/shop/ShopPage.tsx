import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextField, TextAreaField } from '@/components/ui/FormField'
import { useSettings, useUpdateSettings } from '@/features/settings/api/useSettings'

const shopSchema = z.object({
  name: z.string().min(2, '2 caractères minimum'),
  description: z.string().min(10, '10 caractères minimum'),
  phone: z.string().min(8, 'Numéro invalide'),
})

type ShopFormValues = z.infer<typeof shopSchema>

export default function ShopPage() {
  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ShopFormValues>({
    resolver: zodResolver(shopSchema),
    values: settings ? { name: settings.name, description: settings.description, phone: settings.phone } : undefined,
  })

  return (
    <div>
      <PageHeader title="Ma boutique" subtitle="Nom, description et téléphone affichés sur votre vitrine publique" />

      {isLoading || !settings ? (
        <p className="text-sm text-[#6b6b68]">Chargement…</p>
      ) : (
        <Card className="p-6">
          <h2 className="font-bold text-[#0a0a0b] mb-4">Informations de la boutique</h2>
          <form
            onSubmit={handleSubmit((values) => updateSettings.mutate(values, { onSuccess: () => reset(values) }))}
            noValidate
            className="space-y-4"
          >
            <TextField label="Nom de la boutique" id="shop-name" required error={errors.name?.message} {...register('name')} />
            <TextAreaField label="Description" id="shop-description" rows={3} required error={errors.description?.message} {...register('description')} />
            <TextField label="Téléphone" id="shop-phone" required error={errors.phone?.message} {...register('phone')} />
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
      )}
    </div>
  )
}
