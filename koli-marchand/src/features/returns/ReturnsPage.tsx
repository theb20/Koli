import { useMemo, useState } from 'react'
import { Clock, Banknote, AlertTriangle, Image as ImageIcon } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { FilterPills } from '@/components/ui/FilterPills'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { fmtDate } from '@/lib/format'
import { returnStatusMap, returnReasonLabels } from '@/lib/statusMaps'
import type { MerchantReturn, OrderReturnStatus } from '@/types'
import { useReturns } from './api/useReturns'
import { ReturnDetailDrawer } from './components/ReturnDetailDrawer'

type StatusFilter = OrderReturnStatus | 'all'

export default function ReturnsPage() {
  const [status, setStatus] = useState<StatusFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading } = useReturns()
  const all = data?.items ?? []
  const returns = status === 'all' ? all : all.filter((r) => r.status === status)
  const selected = all.find((r) => r.id === selectedId) ?? null

  const statCounts = useMemo(() => {
    const all = data?.items ?? []
    return {
      pending: all.filter((r) => r.status === 'requested').length,
      refunded: all.filter((r) => r.status === 'refunded').length,
      damaged: all.filter((r) => r.merchantDamaged).length,
    }
  }, [data])

  const columns: DataTableColumn<MerchantReturn>[] = [
    { key: 'orderNumber', header: 'N° commande', render: (r) => <span className="font-semibold text-[#0a0a0b]">{r.orderNumber}</span> },
    { key: 'client', header: 'Client', render: (r) => r.client },
    { key: 'reason', header: 'Motif', render: (r) => returnReasonLabels[r.reason] },
    { key: 'items', header: 'Articles', align: 'right', render: (r) => r.items.reduce((s, it) => s + it.quantity, 0) },
    { key: 'date', header: 'Date', render: (r) => fmtDate(r.requestedAt) },
    {
      key: 'status',
      header: 'Statut',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge label={returnStatusMap[r.status].label} tone={returnStatusMap[r.status].tone} />
          {r.proofUrl && <ImageIcon size={13} className="text-emerald-500" />}
          {r.merchantDamaged && <AlertTriangle size={13} className="text-red-500" />}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Retours"
        subtitle="Retours clients touchant vos articles — consultation et constat à la réception"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="En attente" value={String(statCounts.pending)} icon={<Clock size={20} />} />
        <StatCard title="Remboursés" value={String(statCounts.refunded)} icon={<Banknote size={20} />} />
        <StatCard title="Signalés endommagés" value={String(statCounts.damaged)} icon={<AlertTriangle size={20} />} />
      </div>

      <div className="mb-5">
        <FilterPills<StatusFilter>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Tous' },
            { value: 'requested', label: 'En attente' },
            { value: 'approved', label: 'Approuvés' },
            { value: 'received', label: 'Reçus' },
            { value: 'refunded', label: 'Remboursés' },
            { value: 'rejected', label: 'Refusés' },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        rows={returns}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        onRowClick={(r) => setSelectedId(r.id)}
        emptyMessage="Aucun retour pour l'instant."
      />

      {selected && <ReturnDetailDrawer ret={selected} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
