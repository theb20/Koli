import { useMemo, useState } from 'react'
import { Clock, PackageCheck, PackageSearch, Truck } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { FilterPills } from '@/components/ui/FilterPills'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { fmtDate, fmtFcfa } from '@/lib/format'
import { orderStatusMap, paymentMethodLabels } from '@/lib/statusMaps'
import type { Order, OrderStatus } from '@/types'
import { useOrders } from './api/useOrders'
import { OrderDetailDrawer } from './components/OrderDetailDrawer'

type StatusFilter = OrderStatus | 'all'

export default function OrdersPage() {
  const [status, setStatus] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const { data, isLoading } = useOrders({ status, search })
  const { data: allData } = useOrders({ status: 'all', search: '' })

  const orders = data?.items ?? []
  const statCounts = useMemo(() => {
    const all = allData?.items ?? []
    return {
      pending: all.filter((o) => o.status === 'pending').length,
      preparing: all.filter((o) => o.status === 'preparing').length,
      shipped: all.filter((o) => o.status === 'shipped').length,
      delivered: all.filter((o) => o.status === 'delivered').length,
    }
  }, [allData])

  const columns: DataTableColumn<Order>[] = [
    { key: 'orderNumber', header: 'N° commande', render: (o) => <span className="font-semibold text-[#0a0a0b]">{o.orderNumber}</span> },
    { key: 'customer', header: 'Client', render: (o) => o.customer.name },
    { key: 'items', header: 'Articles', align: 'right', render: (o) => o.itemsCount },
    { key: 'date', header: 'Date', render: (o) => fmtDate(o.createdAt) },
    { key: 'amount', header: 'Montant', align: 'right', render: (o) => <span className="font-semibold">{fmtFcfa(o.totalAmount)}</span> },
    { key: 'payment', header: 'Paiement', render: (o) => paymentMethodLabels[o.paymentMethod] },
    {
      key: 'status',
      header: 'Statut',
      render: (o) => <StatusBadge label={orderStatusMap[o.status].label} tone={orderStatusMap[o.status].tone} />,
    },
  ]

  return (
    <div>
      <PageHeader title="Commandes" subtitle="Suivez et gérez toutes les commandes de votre boutique" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="En attente" value={String(statCounts.pending)} icon={<Clock size={20} />} />
        <StatCard title="En préparation" value={String(statCounts.preparing)} icon={<PackageSearch size={20} />} />
        <StatCard title="Expédiées" value={String(statCounts.shipped)} icon={<Truck size={20} />} />
        <StatCard title="Livrées" value={String(statCounts.delivered)} icon={<PackageCheck size={20} />} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <FilterPills<StatusFilter>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Toutes' },
            { value: 'pending', label: 'En attente' },
            { value: 'preparing', label: 'En préparation' },
            { value: 'shipped', label: 'Expédiées' },
            { value: 'delivered', label: 'Livrées' },
            { value: 'cancelled', label: 'Annulées' },
          ]}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client, un n° de commande..."
          aria-label="Rechercher une commande"
          className="sm:ml-auto sm:w-72 rounded-xl border border-[#e8e8e4] px-3 py-2 text-sm focus:border-[#1E90FF] focus:ring-2 focus:ring-[#1E90FF]/20 transition-colors"
        />
      </div>

      <DataTable
        columns={columns}
        rows={orders}
        rowKey={(o) => o.id}
        isLoading={isLoading}
        onRowClick={(o) => setSelectedOrderId(o.id)}
        emptyMessage="Aucune commande ne correspond à ces filtres."
      />

      {selectedOrderId && <OrderDetailDrawer orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />}
    </div>
  )
}
