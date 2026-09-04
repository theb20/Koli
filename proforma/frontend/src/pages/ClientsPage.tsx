import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Search, Plus, Trash2, Pencil } from '../components/ui/Icon'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { SkeletonRows } from '../components/ui/Skeleton'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ClientFormModal } from '../components/client/ClientFormModal'
import type { Client } from '../types'

export default function ClientsPage() {
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId)
  const pushToast = useUiStore((s) => s.pushToast)
  const [clients, setClients] = useState<Client[] | null>(null)
  const [q, setQ] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Client | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null)

  async function load() {
    if (!activeCompanyId) return
    const params = q ? `?q=${encodeURIComponent(q)}` : ''
    const res = await api.get<{ clients: Client[] }>(`/api/companies/${activeCompanyId}/clients${params}`)
    setClients(res.clients)
  }

  useEffect(() => {
    const handle = setTimeout(load, 200)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId, q])

  async function handleDelete() {
    if (!confirmDelete) return
    await api.delete(`/api/clients/${confirmDelete.id}`)
    pushToast('Client supprimé', 'success')
    setConfirmDelete(null)
    load()
  }

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Clients</h1>
          <p className="text-sm text-muted">{clients?.length ?? '…'} client(s)</p>
        </div>
        <Button
          icon={<Plus size={15} />}
          onClick={() => {
            setEditing(undefined)
            setFormOpen(true)
          }}
        >
          Nouveau client
        </Button>
      </div>

      <div className="flex items-center gap-2 border border-border bg-white px-3 py-2 sm:max-w-sm">
        <Search size={15} className="text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un client…" className="w-full bg-transparent text-sm focus:outline-none" />
      </div>

      {!clients ? (
        <SkeletonRows rows={5} />
      ) : clients.length === 0 ? (
        <EmptyState icon={<Users size={20} />} title="Aucun client" description="Ajoutez votre premier client pour commencer à facturer." action={<Button onClick={() => setFormOpen(true)}>Nouveau client</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <div key={c.id} className="group border border-border bg-white p-4">
              <div className="flex items-start justify-between">
                <Link to={`/clients/${c.id}`} className="flex-1">
                  <div className="flex h-9 w-9 items-center justify-center bg-brand-light text-sm font-bold text-brand-dark">{c.name[0]}</div>
                  <p className="mt-2 text-sm font-bold text-ink">{c.name}</p>
                  <p className="text-xs text-muted">{c.contactName}</p>
                  <p className="text-xs text-muted">{c.email}</p>
                  <p className="mt-1 text-[11px] text-muted">
                    {c._count?.proformas ?? 0} proforma(s) · {c._count?.invoices ?? 0} facture(s)
                  </p>
                </Link>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => {
                      setEditing(c)
                      setFormOpen(true)
                    }}
                    className="p-1.5 text-muted hover:bg-gray-100"
                  >
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setConfirmDelete(c)} className="p-1.5 text-muted hover:bg-red-50 hover:text-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClientFormModal open={formOpen} onClose={() => setFormOpen(false)} client={editing} companyId={activeCompanyId!} onSaved={load} />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Supprimer le client"
        message={`Supprimer ${confirmDelete?.name} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
