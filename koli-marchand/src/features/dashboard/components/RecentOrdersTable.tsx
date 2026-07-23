import { Link } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { fmtFcfa, fmtDate } from '@/lib/format'
import { orderStatusMap } from '@/lib/statusMaps'
import type { Order } from '@/types'

interface RecentOrdersTableProps {
  orders: Order[]
}

const columns: DataTableColumn<Order>[] = [
  { key: 'orderNumber', header: 'Commande', render: (o) => <span className="font-semibold text-[#0a0a0b]">{o.orderNumber}</span> },
  { key: 'customer', header: 'Client', render: (o) => o.customer.name },
  { key: 'date', header: 'Date', render: (o) => fmtDate(o.createdAt) },
  { key: 'amount', header: 'Montant', align: 'right', render: (o) => <span className="font-semibold">{fmtFcfa(o.totalAmount)}</span> },
  {
    key: 'status',
    header: 'Statut',
    render: (o) => <StatusBadge label={orderStatusMap[o.status].label} tone={orderStatusMap[o.status].tone} />,
  },
]

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-[#0a0a0b]">Commandes récentes</h2>
        <Link to="/commandes" className="text-sm font-semibold text-[#1E90FF] hover:underline">
          Tout voir
        </Link>
      </div>
      <DataTable columns={columns} rows={orders} rowKey={(o) => o.id} />
    </div>
  )
}
