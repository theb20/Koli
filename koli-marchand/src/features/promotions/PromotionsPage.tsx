import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { FilterPills } from '@/components/ui/FilterPills'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ActionsMenu } from '@/components/ui/ActionsMenu'
import { fmtDate, fmtFcfa } from '@/lib/format'
import { promotionStatusMap } from '@/lib/statusMaps'
import type { Promotion, PromotionInput, PromotionStatus } from '@/types'
import { useCreatePromotion, useDeletePromotion, usePromotions, useUpdatePromotion } from './api/usePromotions'
import { PromotionFormModal } from './components/PromotionFormModal'

type StatusFilter = PromotionStatus | 'all'

export default function PromotionsPage() {
  const [status, setStatus] = useState<StatusFilter>('all')
  const [modalMode, setModalMode] = useState<'create' | Promotion | null>(null)

  const { data, isLoading } = usePromotions()
  const createPromotion = useCreatePromotion()
  const updatePromotion = useUpdatePromotion()
  const deletePromotion = useDeletePromotion()

  const promotions = useMemo(() => {
    const all = data ?? []
    return status === 'all' ? all : all.filter((p) => p.status === status)
  }, [data, status])

  const closeModal = () => setModalMode(null)

  const handleSubmit = (input: PromotionInput) => {
    if (modalMode === 'create') {
      createPromotion.mutate(input, { onSuccess: closeModal })
    } else if (modalMode) {
      updatePromotion.mutate({ id: modalMode.id, input }, { onSuccess: closeModal })
    }
  }

  const columns: DataTableColumn<Promotion>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (p) => (
        <div>
          <p className="font-semibold text-[#0a0a0b]">{p.code}</p>
          <p className="text-xs text-[#a3a3a1] truncate max-w-[220px]">{p.description}</p>
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Remise',
      render: (p) => (p.type === 'percentage' ? `${p.value}%` : fmtFcfa(p.value)),
    },
    { key: 'validity', header: 'Validité', render: (p) => `${fmtDate(p.startDate)} → ${fmtDate(p.endDate)}` },
    {
      key: 'usage',
      header: 'Utilisation',
      align: 'right',
      render: (p) => `${p.usageCount}${p.usageLimit ? ` / ${p.usageLimit}` : ''}`,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (p) => <StatusBadge label={promotionStatusMap[p.status].label} tone={promotionStatusMap[p.status].tone} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => (
        <ActionsMenu
          items={[
            { label: 'Éditer', onClick: () => setModalMode(p) },
            { label: 'Supprimer', danger: true, onClick: () => deletePromotion.mutate(p.id) },
          ]}
        />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Promotions"
        subtitle="Gérez vos coupons et remises"
        action={
          <Button icon={<Plus size={16} />} onClick={() => setModalMode('create')}>
            Créer une promotion
          </Button>
        }
      />

      <div className="mb-5">
        <FilterPills<StatusFilter>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Toutes' },
            { value: 'active', label: 'Actives' },
            { value: 'scheduled', label: 'Programmées' },
            { value: 'expired', label: 'Expirées' },
            { value: 'draft', label: 'Brouillons' },
          ]}
        />
      </div>

      <DataTable columns={columns} rows={promotions} rowKey={(p) => p.id} isLoading={isLoading} emptyMessage="Aucune promotion pour ce filtre." />

      {modalMode && (
        <PromotionFormModal
          promotion={modalMode === 'create' ? undefined : modalMode}
          onClose={closeModal}
          onSubmit={handleSubmit}
          isSubmitting={createPromotion.isPending || updatePromotion.isPending}
        />
      )}
    </div>
  )
}
