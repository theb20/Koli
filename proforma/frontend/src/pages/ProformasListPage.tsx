import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, FileText, Download, Copy, Trash2, MoreVertical, ArrowUpDown } from '../components/ui/Icon'
import { api, pdfUrl } from '../lib/api'
import { formatMoney } from '../lib/money'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { SkeletonRows } from '../components/ui/Skeleton'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import type { Proforma, ProformaStatus } from '../types'

const STATUS_OPTIONS: { value: ProformaStatus | ''; label: string }[] = [
  { value: '', label: 'Tous les statuts' },
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'SENT', label: 'Envoyée' },
  { value: 'VIEWED', label: 'Consultée' },
  { value: 'ACCEPTED', label: 'Acceptée' },
  { value: 'REFUSED', label: 'Refusée' },
  { value: 'EXPIRED', label: 'Expirée' },
  { value: 'CONVERTED', label: 'Convertie' },
]

export default function ProformasListPage() {
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId)
  const pushToast = useUiStore((s) => s.pushToast)
  const navigate = useNavigate()

  const [proformas, setProformas] = useState<(Proforma & { client: { name: string } })[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<ProformaStatus | ''>('')
  const [sort, setSort] = useState<'recent' | 'amount_desc' | 'amount_asc'>('recent')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<string | 'bulk' | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!activeCompanyId) return
    setLoading(true)
    const params = new URLSearchParams({ sort })
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    try {
      const res = await api.get<{ proformas: (Proforma & { client: { name: string } })[]; total: number }>(
        `/api/companies/${activeCompanyId}/proformas?${params}`
      )
      setProformas(res.proformas)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }, [activeCompanyId, q, status, sort])

  useEffect(() => {
    const handle = setTimeout(load, 200)
    return () => clearTimeout(handle)
  }, [load])

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((s) => (s.size === proformas.length ? new Set() : new Set(proformas.map((p) => p.id))))
  }

  async function handleDuplicate(id: string) {
    setOpenMenu(null)
    const res = await api.post<{ proforma: Proforma }>(`/api/proformas/${id}/duplicate`)
    pushToast(`Dupliquée sous ${res.proforma.number}`, 'success')
    navigate(`/proformas/${res.proforma.id}/modifier`)
  }

  async function handleDelete() {
    if (!confirmDelete) return
    if (confirmDelete === 'bulk') {
      await api.post('/api/proformas/bulk-delete', { ids: Array.from(selected) })
      pushToast(`${selected.size} proforma(s) supprimée(s)`, 'success')
      setSelected(new Set())
    } else {
      await api.delete(`/api/proformas/${confirmDelete}`)
      pushToast('Proforma supprimée', 'success')
    }
    setConfirmDelete(null)
    load()
  }

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Mes proformas</h1>
          <p className="text-sm text-muted">{total} document(s)</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => navigate('/proformas/nouvelle')}>
          Nouvelle proforma
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 border border-border bg-white px-3 py-2">
          <Search size={15} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par numéro, objet, client…"
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as ProformaStatus | '')} className="h-10 border border-border bg-white px-3 text-sm">
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setSort(sort === 'amount_desc' ? 'amount_asc' : sort === 'amount_asc' ? 'recent' : 'amount_desc')}
          className="flex h-10 items-center gap-1.5 border border-border bg-white px-3 text-sm text-ink hover:bg-gray-50"
        >
          <ArrowUpDown size={14} />
          {sort === 'recent' ? 'Plus récentes' : sort === 'amount_desc' ? 'Montant décroissant' : 'Montant croissant'}
        </button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-ink px-4 py-2.5 text-sm text-white">
          <span>{selected.size} sélectionnée(s)</span>
          <button onClick={() => setConfirmDelete('bulk')} className="ml-auto flex items-center gap-1.5 text-red-300 hover:text-red-200">
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      )}

      {loading ? (
        <SkeletonRows rows={6} />
      ) : proformas.length === 0 ? (
        <EmptyState
          icon={<FileText size={20} />}
          title="Aucune proforma"
          description="Créez votre première facture proforma pour commencer."
          action={<Button onClick={() => navigate('/proformas/nouvelle')}>Nouvelle proforma</Button>}
        />
      ) : (
        <div className="overflow-x-auto border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={selected.size === proformas.length} onChange={toggleSelectAll} />
                </th>
                <th className="px-3 py-3">Numéro</th>
                <th className="px-3 py-3">Client</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Expiration</th>
                <th className="px-3 py-3 text-right">Total TTC</th>
                <th className="px-3 py-3">Statut</th>
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {proformas.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} />
                  </td>
                  <td className="px-3 py-3">
                    <Link to={`/proformas/${p.id}`} className="font-semibold text-ink hover:text-brand">
                      {p.number}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-ink">{p.client?.name}</td>
                  <td className="px-3 py-3 text-muted">{new Date(p.issueDate).toLocaleDateString('fr-FR')}</td>
                  <td className="px-3 py-3 text-muted">{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="px-3 py-3 text-right font-semibold text-ink">{formatMoney(p.total, p.currency)}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="relative px-3 py-3">
                    <button onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)} className="p-1.5 text-muted hover:bg-gray-100">
                      <MoreVertical size={15} />
                    </button>
                    {openMenu === p.id && (
                      <div className="absolute right-3 top-10 z-10 w-44 border border-border bg-white p-1.5 shadow-lg">
                        <Link to={`/proformas/${p.id}`} onClick={() => setOpenMenu(null)} className="block px-2.5 py-2 text-left text-sm hover:bg-gray-50">
                          Voir
                        </Link>
                        {p.status !== 'CONVERTED' && (
                          <Link to={`/proformas/${p.id}/modifier`} onClick={() => setOpenMenu(null)} className="block px-2.5 py-2 text-left text-sm hover:bg-gray-50">
                            Modifier
                          </Link>
                        )}
                        <button onClick={() => handleDuplicate(p.id)} className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm hover:bg-gray-50">
                          <Copy size={13} /> Dupliquer
                        </button>
                        <a href={pdfUrl('proformas', p.id)} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-2.5 py-2 text-left text-sm hover:bg-gray-50">
                          <Download size={13} /> Télécharger PDF
                        </a>
                        <button
                          onClick={() => {
                            setOpenMenu(null)
                            setConfirmDelete(p.id)
                          }}
                          className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm text-danger hover:bg-red-50"
                        >
                          <Trash2 size={13} /> Supprimer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Supprimer"
        message={confirmDelete === 'bulk' ? `Supprimer ${selected.size} proforma(s) sélectionnée(s) ? Cette action est irréversible.` : 'Supprimer cette proforma ? Cette action est irréversible.'}
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
