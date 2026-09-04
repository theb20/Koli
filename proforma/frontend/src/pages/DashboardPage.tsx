import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, TrendingUp, Send, CheckCircle2, Clock, ArrowUpRight } from '../components/ui/Icon'
import { api } from '../lib/api'
import { formatMoney } from '../lib/money'
import { useAuthStore } from '../store/authStore'
import { StatusBadge } from '../components/ui/StatusBadge'
import { SkeletonRows } from '../components/ui/Skeleton'
import type { DashboardStats, Proforma, Client, ActivityEntry, Currency } from '../types'

interface DashboardResponse {
  stats: DashboardStats
  monthly: { key: string; label: string; count: number; total: number }[]
  recentProformas: (Proforma & { client: { name: string } })[]
  recentClients: Client[]
  activity: (ActivityEntry & { proforma?: { number: string } | null; invoice?: { number: string } | null })[]
}

export default function DashboardPage() {
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId)
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [currency, setCurrency] = useState<Currency>('XOF')

  useEffect(() => {
    if (!activeCompanyId) return
    api.get<DashboardResponse & { success: true }>(`/api/companies/${activeCompanyId}/dashboard`).then((res) => {
      setData(res)
      setCurrency((res.recentProformas[0]?.currency as Currency) || 'XOF')
    })
  }, [activeCompanyId])

  if (!data) {
    return (
      <div className="p-6 lg:p-8">
        <SkeletonRows rows={6} />
      </div>
    )
  }

  const { stats, monthly, recentProformas, recentClients, activity } = data
  const maxMonthly = Math.max(...monthly.map((m) => m.total), 1)

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-extrabold text-ink">Tableau de bord</h1>
        <p className="text-sm text-muted">Vue d'ensemble de votre activité de facturation proforma.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<TrendingUp size={16} />} label="Chiffre d'affaires estimé" value={formatMoney(stats.totalAmount, currency)} accent />
        <StatCard icon={<FileText size={16} />} label="Proformas" value={String(stats.totalCount)} sub={`${stats.draft} brouillons`} />
        <StatCard icon={<Send size={16} />} label="Envoyées / en attente" value={String(stats.sent)} />
        <StatCard icon={<CheckCircle2 size={16} />} label="Acceptées" value={String(stats.accepted)} sub={`${stats.refused} refusées`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="border border-border bg-white p-5 lg:col-span-2">
          <p className="mb-4 text-sm font-bold text-ink">Évolution des proformas (6 derniers mois)</p>
          <div className="flex h-40 items-end gap-3">
            {monthly.map((m) => (
              <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[10px] font-semibold text-muted">{m.count > 0 ? formatMoney(m.total, currency) : ''}</span>
                <div
                  className="w-full bg-brand transition-all"
                  style={{ height: `${Math.max((m.total / maxMonthly) * 100, m.count > 0 ? 4 : 1)}%`, minHeight: 3 }}
                />
                <span className="text-[10px] font-medium capitalize text-muted">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-border bg-white p-5">
          <p className="mb-4 text-sm font-bold text-ink">Statuts</p>
          <div className="flex flex-col gap-2.5">
            <StatusRow label="Brouillon" value={stats.draft} total={stats.totalCount} color="bg-gray-400" />
            <StatusRow label="Envoyée / en attente" value={stats.sent} total={stats.totalCount} color="bg-blue-500" />
            <StatusRow label="Acceptée" value={stats.accepted} total={stats.totalCount} color="bg-emerald-500" />
            <StatusRow label="Refusée" value={stats.refused} total={stats.totalCount} color="bg-red-500" />
            <StatusRow label="Expirée" value={stats.expired} total={stats.totalCount} color="bg-orange-400" />
            <StatusRow label="Convertie" value={stats.converted} total={stats.totalCount} color="bg-brand" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="border border-border bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <p className="text-sm font-bold text-ink">Dernières factures proforma</p>
            <Link to="/proformas" className="flex items-center gap-1 text-xs font-semibold text-brand">
              Voir tout <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentProformas.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">Aucune proforma pour le moment.</p>}
            {recentProformas.map((p) => (
              <Link key={p.id} to={`/proformas/${p.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-semibold text-ink">{p.number}</p>
                  <p className="text-xs text-muted">{p.client?.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-ink">{formatMoney(p.total, p.currency)}</span>
                  <StatusBadge status={p.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <p className="text-sm font-bold text-ink">Derniers clients</p>
            <Link to="/clients" className="flex items-center gap-1 text-xs font-semibold text-brand">
              Voir tout <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentClients.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">Aucun client pour le moment.</p>}
            {recentClients.map((c) => (
              <Link key={c.id} to={`/clients/${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                <div className="flex h-8 w-8 items-center justify-center bg-brand-light text-xs font-bold text-brand-dark">
                  {c.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                  <p className="truncate text-xs text-muted">{c.email}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-border bg-white p-5">
        <p className="mb-3 text-sm font-bold text-ink">Activité récente</p>
        {activity.length === 0 && <p className="text-sm text-muted">Aucune activité récente.</p>}
        <div className="flex flex-col gap-2.5">
          {activity.map((a) => (
            <div key={a.id} className="flex items-center gap-2.5 text-sm">
              <Clock size={13} className="shrink-0 text-muted" />
              <span className="text-ink">{a.action}</span>
              {(a.proforma || a.invoice) && (
                <span className="font-semibold text-brand">{a.proforma?.number || a.invoice?.number}</span>
              )}
              <span className="ml-auto shrink-0 text-xs text-muted">{new Date(a.createdAt).toLocaleString('fr-FR')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={` border p-4 ${accent ? 'border-brand/20 bg-brand-light' : 'border-border bg-white'}`}>
      <div className={`mb-2 flex h-8 w-8 items-center justify-center ${accent ? 'bg-brand text-white' : 'bg-gray-100 text-ink'}`}>{icon}</div>
      <p className="text-lg font-extrabold text-ink">{value}</p>
      <p className="text-xs text-muted">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted">{sub}</p>}
    </div>
  )
}

function StatusRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-ink">{label}</span>
        <span className="font-semibold text-muted">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden bg-gray-100">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
