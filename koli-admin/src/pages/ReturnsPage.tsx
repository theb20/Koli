import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { RotateCcw, Search, Clock, CheckCircle2, Banknote } from 'lucide-react'
import { api, fmt, fmtDate } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { StatCard } from '../components/ui/Card'
import { PageTitle } from '../components/layout/Sidebar'
import type { OrderReturn, OrderReturnStatus } from '../types'

type StatusFilter = 'all' | OrderReturnStatus

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all',       label: 'Tous' },
  { value: 'requested', label: 'En attente' },
  { value: 'approved',  label: 'Approuvés' },
  { value: 'received',  label: 'Reçus' },
  { value: 'refunded',  label: 'Remboursés' },
  { value: 'rejected',  label: 'Refusés' },
  { value: 'cancelled', label: 'Annulés' },
]

const REASON_LABELS: Record<string, string> = {
  defective:        'Défectueux',
  wrong_item:       'Mauvais article',
  not_as_described: 'Non conforme',
  no_longer_needed: 'Plus besoin',
  other:            'Autre',
}

async function fetchReturns(status: StatusFilter) {
  const q = status !== 'all' ? `?status=${status}` : ''
  const { data } = await api.get(`/api/returns/admin/all${q}`)
  return data.data as OrderReturn[]
}

export default function ReturnsPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<StatusFilter>('all')

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ['returns', status],
    queryFn:  () => fetchReturns(status),
    placeholderData: (prev) => prev,
  })

  const { data: allReturns = [] } = useQuery({
    queryKey: ['returns', 'all'],
    queryFn:  () => fetchReturns('all'),
  })

  const pendingCount  = allReturns.filter(r => r.status === 'requested').length
  const refundedTotal = allReturns.filter(r => r.status === 'refunded').reduce((s, r) => s + (r.refundAmount ?? 0), 0)

  return (
    <div className="space-y-5">
      <PageTitle title="Retours de commande" sub="Demandes de retour clients — approbation, suivi, remboursement" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total" value={allReturns.length} icon={<RotateCcw size={18} />} />
        <StatCard title="En attente" value={pendingCount} icon={<Clock size={18} />} color="orange" />
        <StatCard title="Remboursés" value={allReturns.filter(r => r.status === 'refunded').length} icon={<CheckCircle2 size={18} />} color="green" />
        <StatCard title="Total remboursé" value={fmt(refundedTotal)} icon={<Banknote size={18} />} color="blue" />
      </div>

      <div className="flex gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit overflow-x-auto">
        {STATUS_TABS.map(t => (
          <button key={t.value} onClick={() => setStatus(t.value)}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              status === t.value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['Commande', 'Client', 'Motif', 'Articles', 'Statut', 'Date', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-8 bg-slate-100 rounded-lg animate-pulse" /></td></tr>
              ))
            ) : returns.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center">
                <Search size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Aucun retour</p>
              </td></tr>
            ) : (
              returns.map(r => (
                <tr key={r.id} onClick={() => navigate(`/returns/${r.id}`)}
                  className={`hover:bg-slate-50 transition-colors cursor-pointer ${r.status === 'requested' ? 'bg-yellow-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{r.order.orderNumber}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">{r.order.clientPrenom}</p>
                    <p className="text-xs text-slate-400">{r.order.clientEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{REASON_LABELS[r.reason] ?? r.reason}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{r.items.reduce((s, it) => s + it.quantity, 0)} article(s)</td>
                  <td className="px-4 py-3"><Badge label={r.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(r.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-semibold text-indigo-600">Voir →</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
