import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, MapPin, Loader2, X, Plus, TrendingUp, CheckCircle2, Clock3 } from '../components/ui/Icon'
import { api } from '../lib/api'
import { formatMoney } from '../lib/money'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useUiStore } from '../store/uiStore'
import type { Client, ClientStats, Currency, ProformaStatus } from '../types'

interface ClientProforma {
  id: string
  number: string
  status: ProformaStatus
  total: number
  currency: Currency
  issueDate: string
}

export default function ClientDetailPage() {
  const { id } = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [proformas, setProformas] = useState<ClientProforma[]>([])
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [notes, setNotes] = useState('')
  const [tagInput, setTagInput] = useState('')
  const pushToast = useUiStore((s) => s.pushToast)

  function load() {
    api.get<{ client: Client; proformas: ClientProforma[]; stats: ClientStats }>(`/api/clients/${id}`).then((res) => {
      setClient(res.client)
      setProformas(res.proformas)
      setStats(res.stats)
      setNotes(res.client.notes || '')
    })
  }

  useEffect(load, [id])

  async function saveNotes() {
    await api.put(`/api/clients/${id}`, { notes })
    pushToast('Notes enregistrées', 'success')
  }

  async function addTag() {
    if (!tagInput.trim() || !client) return
    const tags = [...(client.tags || []), tagInput.trim()]
    const res = await api.put<{ client: Client }>(`/api/clients/${id}`, { tags })
    setClient(res.client)
    setTagInput('')
  }

  async function removeTag(tag: string) {
    if (!client) return
    const tags = (client.tags || []).filter((t) => t !== tag)
    const res = await api.put<{ client: Client }>(`/api/clients/${id}`, { tags })
    setClient(res.client)
  }

  if (!client || !stats) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={24} />
      </div>
    )
  }

  const totalBilled = proformas.reduce((sum, p) => sum + p.total, 0)

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Link to="/clients" className="p-1.5 text-muted hover:bg-gray-100">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-extrabold text-ink">{client.name}</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<TrendingUp size={15} />} label="CA réalisé (payé)" value={formatMoney(stats.totalRevenue, stats.currency)} />
        <StatCard
          icon={<CheckCircle2 size={15} />}
          label="Taux d'acceptation"
          value={stats.acceptanceRate !== null ? `${stats.acceptanceRate}%` : '—'}
          sub={`${stats.respondedCount} document(s) répondu(s)`}
        />
        <StatCard
          icon={<Clock3 size={15} />}
          label="Délai moyen de paiement"
          value={stats.avgPaymentDelayDays !== null ? `${stats.avgPaymentDelayDays} j` : '—'}
          sub={`${stats.paidInvoicesCount} facture(s) payée(s)`}
        />
        <StatCard icon={<TrendingUp size={15} />} label="Montant total facturé (proformas)" value={formatMoney(totalBilled, proformas[0]?.currency || 'XOF')} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-1">
          <div className="border border-border bg-white p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Informations</p>
            <div className="flex flex-col gap-2.5 text-sm">
              {client.contactName && <p className="text-ink">{client.contactName}</p>}
              {client.email && (
                <p className="flex items-center gap-2 text-muted">
                  <Mail size={14} /> {client.email}
                </p>
              )}
              {client.phone && (
                <p className="flex items-center gap-2 text-muted">
                  <Phone size={14} /> {client.phone}
                </p>
              )}
              {client.address && (
                <p className="flex items-center gap-2 text-muted">
                  <MapPin size={14} /> {client.address}
                </p>
              )}
            </div>
          </div>

          <div className="border border-border bg-white p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Tags</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {(client.tags || []).map((tag) => (
                <span key={tag} className="flex items-center gap-1 bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand-dark">
                  {tag}
                  <button onClick={() => removeTag(tag)}>
                    <X size={11} />
                  </button>
                </span>
              ))}
              {(client.tags || []).length === 0 && <p className="text-xs text-muted">Aucun tag.</p>}
            </div>
            <div className="flex gap-1.5">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Ajouter un tag…"
                className="h-8 flex-1 border border-border px-2 text-xs"
              />
              <button onClick={addTag} className="border border-border p-1.5 text-muted hover:bg-gray-50">
                <Plus size={13} />
              </button>
            </div>
          </div>

          <div className="border border-border bg-white p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Notes internes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={4}
              placeholder="Notes visibles uniquement par votre équipe…"
              className="w-full border border-border p-2.5 text-sm"
            />
          </div>
        </div>

        <div className="border border-border bg-white lg:col-span-2">
          <div className="border-b border-border px-5 py-4">
            <p className="text-sm font-bold text-ink">Proformas ({proformas.length})</p>
          </div>
          <div className="divide-y divide-border">
            {proformas.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">Aucune proforma pour ce client.</p>}
            {proformas.map((p) => (
              <Link key={p.id} to={`/proformas/${p.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-semibold text-ink">{p.number}</p>
                  <p className="text-xs text-muted">{new Date(p.issueDate).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-ink">{formatMoney(p.total, p.currency)}</span>
                  <StatusBadge status={p.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="border border-border bg-white p-4">
      <div className="mb-2 flex h-8 w-8 items-center justify-center bg-brand-light text-brand-dark">{icon}</div>
      <p className="text-lg font-extrabold text-ink">{value}</p>
      <p className="text-xs text-muted">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted">{sub}</p>}
    </div>
  )
}
