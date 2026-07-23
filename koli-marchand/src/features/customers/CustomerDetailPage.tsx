import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Mail, MapPin, Phone } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { fmtDate, fmtFcfa } from '@/lib/format'
import { customerSegmentMap, orderStatusMap } from '@/lib/statusMaps'
import type { Order } from '@/types'
import { useCustomer } from './api/useCustomers'

const columns: DataTableColumn<Order>[] = [
  { key: 'orderNumber', header: 'Commande', render: (o) => <span className="font-semibold text-[#0a0a0b]">{o.orderNumber}</span> },
  { key: 'date', header: 'Date', render: (o) => fmtDate(o.createdAt) },
  { key: 'amount', header: 'Montant', align: 'right', render: (o) => <span className="font-semibold">{fmtFcfa(o.totalAmount)}</span> },
  {
    key: 'status',
    header: 'Statut',
    render: (o) => <StatusBadge label={orderStatusMap[o.status].label} tone={orderStatusMap[o.status].tone} />,
  },
]

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useCustomer(id)

  if (isLoading) return <p className="text-sm text-[#6b6b68]">Chargement…</p>
  if (!data) return <p className="text-sm text-[#6b6b68]">Client introuvable.</p>

  const { customer, orders } = data

  return (
    <div>
      <Link to="/clients" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6b6b68] hover:text-[#0a0a0b] mb-4">
        <ArrowLeft size={15} /> Retour aux clients
      </Link>

      <PageHeader
        title={customer.name}
        subtitle={`Client depuis le ${fmtDate(customer.createdAt)}`}
        action={<StatusBadge label={customerSegmentMap[customer.segment].label} tone={customerSegmentMap[customer.segment].tone} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Commandes" value={String(customer.ordersCount)} icon={<Mail size={20} />} />
        <StatCard title="Total dépensé" value={fmtFcfa(customer.totalSpent)} icon={<Phone size={20} />} />
        <StatCard title="Dernière commande" value={customer.lastOrderAt ? fmtDate(customer.lastOrderAt) : '—'} icon={<MapPin size={20} />} />
      </div>

      <Card className="p-5 mb-6">
        <h2 className="font-bold text-[#0a0a0b] mb-4">Coordonnées</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs font-semibold text-[#6b6b68] uppercase tracking-wider mb-1">Téléphone</dt>
            <dd className="text-[#0a0a0b]">{customer.phone}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[#6b6b68] uppercase tracking-wider mb-1">E-mail</dt>
            <dd className="text-[#0a0a0b]">{customer.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[#6b6b68] uppercase tracking-wider mb-1">Ville</dt>
            <dd className="text-[#0a0a0b]">{customer.city}, {customer.country}</dd>
          </div>
        </dl>
      </Card>

      <h2 className="font-bold text-[#0a0a0b] mb-4">Historique des commandes</h2>
      <DataTable columns={columns} rows={orders} rowKey={(o) => o.id} emptyMessage="Aucune commande pour ce client." />
    </div>
  )
}
