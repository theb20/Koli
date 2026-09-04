import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Receipt } from '../components/ui/Icon'
import { api } from '../lib/api'
import { formatMoney } from '../lib/money'
import { useAuthStore } from '../store/authStore'
import { StatusBadge } from '../components/ui/StatusBadge'
import { EmptyState } from '../components/ui/EmptyState'
import { SkeletonRows } from '../components/ui/Skeleton'
import type { Invoice } from '../types'

export default function InvoicesListPage() {
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId)
  const [invoices, setInvoices] = useState<(Invoice & { client: { name: string } })[] | null>(null)

  useEffect(() => {
    if (!activeCompanyId) return
    api.get<{ invoices: (Invoice & { client: { name: string } })[] }>(`/api/companies/${activeCompanyId}/invoices`).then((res) => setInvoices(res.invoices))
  }, [activeCompanyId])

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-extrabold text-ink">Factures</h1>
        <p className="text-sm text-muted">Factures définitives, issues de la conversion de vos proformas acceptées.</p>
      </div>

      {!invoices ? (
        <SkeletonRows rows={5} />
      ) : invoices.length === 0 ? (
        <EmptyState icon={<Receipt size={20} />} title="Aucune facture" description="Convertissez une proforma acceptée en facture pour la voir apparaître ici." />
      ) : (
        <div className="overflow-x-auto border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Numéro</th>
                <th className="px-3 py-3">Client</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3 text-right">Total TTC</th>
                <th className="px-3 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/factures/${inv.id}`} className="font-semibold text-ink hover:text-brand">
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-ink">{inv.client?.name}</td>
                  <td className="px-3 py-3 text-muted">{new Date(inv.issueDate).toLocaleDateString('fr-FR')}</td>
                  <td className="px-3 py-3 text-right font-semibold text-ink">{formatMoney(inv.total, inv.currency)}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={inv.status} kind="invoice" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
