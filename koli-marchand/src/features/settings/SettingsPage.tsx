import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TextField, TextAreaField } from '@/components/ui/FormField'
import { FilterPills } from '@/components/ui/FilterPills'
import { useSettings, useUpdateSettings } from './api/useSettings'
import SecurityTab from './SecurityTab'

const shopSchema = z.object({
  name: z.string().min(2, '2 caractères minimum'),
  description: z.string().min(10, '10 caractères minimum'),
  phone: z.string().min(8, 'Numéro invalide'),
})

type ShopFormValues = z.infer<typeof shopSchema>
type SettingsTab = 'boutique' | 'securite'

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('boutique')

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Gérez les informations de votre boutique et la sécurité de votre compte" />

      <div className="mb-6">
        <FilterPills
          options={[
            { value: 'boutique', label: 'Boutique' },
            { value: 'securite', label: 'Sécurité' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'boutique' ? <ShopTab /> : <SecurityTab />}
    </div>
  )
}

function ShopTab() {
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

  if (isLoading || !settings) return <p className="text-sm text-[#6b6b68]">Chargement…</p>

  return (
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
  )
}
