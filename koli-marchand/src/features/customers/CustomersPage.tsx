import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterPills } from '@/components/ui/FilterPills'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { fmtDate, fmtFcfa } from '@/lib/format'
import { customerSegmentMap } from '@/lib/statusMaps'
import type { Customer, CustomerSegment } from '@/types'
import { useCustomers } from './api/useCustomers'

type SegmentFilter = CustomerSegment | 'all'

export default function CustomersPage() {
  const [segment, setSegment] = useState<SegmentFilter>('all')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const { data, isLoading } = useCustomers({ segment, search })

  const columns: DataTableColumn<Customer>[] = [
    { key: 'name', header: 'Client', render: (c) => <span className="font-semibold text-[#0a0a0b]">{c.name}</span> },
    { key: 'city', header: 'Ville', render: (c) => `${c.city}, ${c.country}` },
    { key: 'orders', header: 'Commandes', align: 'right', render: (c) => c.ordersCount },
    { key: 'spent', header: 'Total dépensé', align: 'right', render: (c) => <span className="font-semibold">{fmtFcfa(c.totalSpent)}</span> },
    { key: 'lastOrder', header: 'Dernière commande', render: (c) => (c.lastOrderAt ? fmtDate(c.lastOrderAt) : '—') },
    {
      key: 'segment',
      header: 'Segment',
      render: (c) => <StatusBadge label={customerSegmentMap[c.segment].label} tone={customerSegmentMap[c.segment].tone} />,
    },
  ]

  return (
    <div>
      <PageHeader title="Clients" subtitle={`${data?.total ?? 0} client${(data?.total ?? 0) > 1 ? 's' : ''} au total`} />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <FilterPills<SegmentFilter>
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'all', label: 'Tous' },
            { value: 'new', label: 'Nouveaux' },
            { value: 'regular', label: 'Réguliers' },
            { value: 'vip', label: 'VIP' },
          ]}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client..."
          aria-label="Rechercher un client"
          className="sm:ml-auto sm:w-72 rounded-xl border border-[#e8e8e4] px-3 py-2 text-sm focus:border-[#1E90FF] focus:ring-2 focus:ring-[#1E90FF]/20 transition-colors"
        />
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        onRowClick={(c) => navigate(`/clients/${c.id}`)}
        emptyMessage="Aucun client ne correspond à ces filtres."
      />
    </div>
  )
}
