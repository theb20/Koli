import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Store, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { api, fmtDate } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { StatCard } from '../components/ui/Card'
import { PageTitle } from '../components/layout/Sidebar'
import { Pagination } from '../components/ui/Pagination'
import type { MerchantApplication, MerchantApplicationStatus, Pagination as PaginationType } from '../types'

type StatusFilter = 'all' | MerchantApplicationStatus

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all',            label: 'Toutes' },
  { value: 'submitted',      label: 'Soumises' },
  { value: 'pending_review', label: 'En revue' },
  { value: 'approved',       label: 'Approuvées' },
  { value: 'rejected',       label: 'Rejetées' },
  { value: 'draft',          label: 'Brouillons' },
]

async function fetchApplications(page: number, status: StatusFilter) {
  const q = new URLSearchParams({ page: String(page), limit: '20', ...(status !== 'all' ? { status } : {}) })
  const { data } = await api.get(`/api/admin/merchant-applications?${q}`)
  return data.data as { data: MerchantApplication[] } & PaginationType
}

export default function MerchantApplicationsPage() {
  const navigate = useNavigate()
  const [page, setPage]     = useState(1)
  const [status, setStatus] = useState<StatusFilter>('submitted')

  const { data, isLoading } = useQuery({
    queryKey: ['merchant-applications', page, status],
    queryFn:  () => fetchApplications(page, status),
    placeholderData: (prev) => prev,
  })

  const { data: submittedData } = useQuery({
    queryKey: ['merchant-applications', 'stats-submitted'],
    queryFn:  () => fetchApplications(1, 'submitted'),
  })
  const { data: approvedData } = useQuery({
    queryKey: ['merchant-applications', 'stats-approved'],
    queryFn:  () => fetchApplications(1, 'approved'),
  })
  const { data: rejectedData } = useQuery({
    queryKey: ['merchant-applications', 'stats-rejected'],
    queryFn:  () => fetchApplications(1, 'rejected'),
  })

  const applications = data?.data ?? []

  return (
    <div className="space-y-5">
      <PageTitle title="Candidatures marchand" sub="Inscriptions Skignas Business en attente de validation (KYC compris)" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="À traiter" value={submittedData?.total ?? 0} icon={<Clock size={18} />} color="orange" />
        <StatCard title="Approuvées" value={approvedData?.total ?? 0} icon={<CheckCircle2 size={18} />} color="green" />
        <StatCard title="Rejetées" value={rejectedData?.total ?? 0} icon={<XCircle size={18} />} color="rose" />
        <StatCard title="Total" value={data?.total ?? 0} icon={<Store size={18} />} />
      </div>

      <div className="flex gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit overflow-x-auto">
        {STATUS_TABS.map(t => (
          <button key={t.value} onClick={() => { setStatus(t.value); setPage(1) }}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              status === t.value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['Boutique', 'Type', 'KYC (Didit)', 'Statut', 'Soumise le', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-8 bg-slate-100 rounded-lg animate-pulse" /></td></tr>
              ))
            ) : applications.length === 0 ? (
              <tr><td colSpan={6} className="py-16 text-center">
                <Search size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Aucune candidature</p>
              </td></tr>
            ) : (
              applications.map(a => (
                <tr key={a.id} onClick={() => navigate(`/merchant-applications/${a.id}`)}
                  className={`hover:bg-slate-50 transition-colors cursor-pointer ${a.status === 'submitted' ? 'bg-indigo-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {a.logoBoutiqueUrl && (
                        <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                          <img src={a.logoBoutiqueUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <p className="text-sm font-medium text-slate-900 truncate max-w-[220px]">{a.nomBoutique || '—'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 capitalize">{a.typeEntreprise}</td>
                  <td className="px-4 py-3">{a.diditStatus ? <Badge label={a.diditStatus} color={a.diditStatus === 'Approved' ? 'approved' : a.diditStatus === 'Declined' ? 'rejected' : 'pending'} /> : <span className="text-xs text-slate-400">—</span>}</td>
                  <td className="px-4 py-3"><Badge label={a.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-400">{a.submittedAt ? fmtDate(a.submittedAt) : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-semibold text-indigo-600">Voir →</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        {data && (
          <Pagination page={page} totalPages={data.totalPages} total={data.total} limit={20} onChange={setPage} />
        )}
      </div>
    </div>
  )
}
