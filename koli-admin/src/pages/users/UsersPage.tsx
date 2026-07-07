import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Search, Users, Shield, ShieldOff, Ban, UserCheck, Trash2, Edit, Eye, Package, X } from 'lucide-react'
import { api, fmtDate } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Pagination } from '../../components/ui/Pagination'
import { PageTitle } from '../../components/layout/Sidebar'
import { Confirm, Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import type { User, Order } from '../../types'

/* ── helpers ──────────────────────────────────────────────── */
async function fetchUsers(params: Record<string, string | number>) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '').map(([k, v]) => [k, String(v)])
  )
  const { data } = await api.get(`/api/auth/users?${q}`)
  return data.data
}

async function fetchUserDetail(id: string) {
  const { data } = await api.get(`/api/auth/users/${id}`)
  // API returns { success, data: { id, prenom, ..., orders: [...] } }
  return data.data as User & { orders: Order[] }
}

type EditForm = { prenom: string; nom: string; email: string; telephone?: string }

/* ── component ────────────────────────────────────────────── */
export default function UsersPage() {
  const qc = useQueryClient()

  // Filters
  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState('')
  const [role,    setRole]    = useState('')
  const [banned,  setBanned]  = useState('')

  // Modals / panels
  const [confirmAdmin,  setConfirmAdmin]  = useState<User | null>(null)
  const [confirmBan,    setConfirmBan]    = useState<User | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)
  const [editingUser,   setEditingUser]   = useState<User | null>(null)
  const [detailUser,    setDetailUser]    = useState<User | null>(null)
  const debouncedSearch = useDebouncedValue(search, 300)

  /* ── queries ──────────────────────────────────────────────── */
  const { data, isLoading } = useQuery({
    queryKey: ['users', page, debouncedSearch, role, banned],
    queryFn:  () => fetchUsers({ page, limit: 20, q: debouncedSearch, role, banned }),
    placeholderData: (prev) => prev,
  })

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['user-detail', detailUser?.id],
    queryFn:  () => fetchUserDetail(detailUser!.id),
    enabled:  !!detailUser,
  })

  /* ── mutations ────────────────────────────────────────────── */
  const toggleRole = useMutation({
    mutationFn: (u: User) => api.patch(`/api/auth/users/${u.id}/role`, { role: u.role === 'admin' ? 'customer' : 'admin' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setConfirmAdmin(null) },
  })

  const toggleBan = useMutation({
    mutationFn: (u: User) => api.patch(`/api/auth/users/${u.id}/ban`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setConfirmBan(null) },
  })

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/api/auth/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setConfirmDelete(null) },
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditForm>()

  const editUser = useMutation({
    mutationFn: ({ id, body }: { id: string; body: EditForm }) => api.put(`/api/auth/users/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditingUser(null); reset() },
  })

  const openEdit = (u: User) => {
    setEditingUser(u)
    reset({ prenom: u.prenom, nom: u.nom, email: u.email, telephone: u.telephone ?? '' })
  }

  const users: User[] = data?.users ?? []

  const inputCls = "w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"

  /* ── stats bar ────────────────────────────────────────────── */
  const total    = data?.pagination?.total  ?? 0
  const totalAll = data?.stats?.total       ?? total
  const totalBan = data?.stats?.banned      ?? 0

  return (
    <div className="space-y-5">
      <PageTitle
        title="Utilisateurs"
        sub={`${total} inscrits · ${totalBan} bannis`}
      />

      {/* Stats mini */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total inscrits', value: totalAll, icon: Users,     color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Administrateurs', value: data?.stats?.admins ?? 0, icon: Shield,    color: 'text-purple-600 bg-purple-50' },
          { label: 'Bannis',          value: totalBan,                  icon: Ban,       color: 'text-red-600 bg-red-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${color}`}><Icon size={16} /></div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
              <p className="text-xl font-bold text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Nom, email..."
            className={`${inputCls} pl-9`} />
        </div>
        <select value={role} onChange={e => { setRole(e.target.value); setPage(1) }}
          className={`${inputCls} w-auto`}>
          <option value="">Tous les rôles</option>
          <option value="admin">Admins</option>
          <option value="customer">Clients</option>
        </select>
        <select value={banned} onChange={e => { setBanned(e.target.value); setPage(1) }}
          className={`${inputCls} w-auto`}>
          <option value="">Tous les statuts</option>
          <option value="false">Actifs</option>
          <option value="true">Bannis</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['Utilisateur', 'Email', 'Téléphone', 'Rôle', 'Statut', 'Inscrit le', 'Commandes', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-3">
                  <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
                </td></tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={8} className="py-16 text-center">
                <Users size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Aucun utilisateur trouvé</p>
              </td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id} className={`transition-colors group ${u.isBanned ? 'bg-red-50/40' : 'hover:bg-slate-50'}`}>
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        u.isBanned
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600'
                      }`}>
                        {u.prenom?.[0]}{u.nom?.[0]}
                      </div>
                      <div>
                        <span className={`text-sm font-medium ${u.isBanned ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {u.prenom} {u.nom}
                        </span>
                        {u.isBanned && <span className="ml-2 text-[10px] font-semibold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">BANNI</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{u.email}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{u.telephone ?? '—'}</td>
                  <td className="px-4 py-3"><Badge label={u.role} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${u.isVerified ? 'text-green-600' : 'text-slate-400'}`}>
                      {u.isVerified ? '✓ Vérifié' : '✗ Non vérifié'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 font-medium">{u._count?.orders ?? 0}</td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Voir détail */}
                      <button onClick={() => setDetailUser(u)}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all" title="Voir commandes">
                        <Eye size={14} />
                      </button>
                      {/* Modifier */}
                      <button onClick={() => openEdit(u)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all" title="Modifier">
                        <Edit size={14} />
                      </button>
                      {/* Promouvoir / Rétrograder */}
                      <button onClick={() => setConfirmAdmin(u)}
                        className={`p-1.5 rounded-lg transition-all ${u.role === 'admin'
                          ? 'hover:bg-orange-50 text-slate-400 hover:text-orange-500'
                          : 'hover:bg-indigo-50 text-slate-400 hover:text-indigo-600'}`}
                        title={u.role === 'admin' ? 'Rétrograder' : 'Promouvoir admin'}>
                        {u.role === 'admin' ? <ShieldOff size={14} /> : <Shield size={14} />}
                      </button>
                      {/* Bannir / Débannir */}
                      <button onClick={() => setConfirmBan(u)}
                        className={`p-1.5 rounded-lg transition-all ${u.isBanned
                          ? 'hover:bg-green-50 text-slate-400 hover:text-green-600'
                          : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`}
                        title={u.isBanned ? 'Débannir' : 'Bannir'}>
                        {u.isBanned ? <UserCheck size={14} /> : <Ban size={14} />}
                      </button>
                      {/* Supprimer */}
                      <button onClick={() => setConfirmDelete(u)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all" title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {data?.pagination && (
          <Pagination page={page} totalPages={data.pagination.totalPages} total={data.pagination.total} limit={20} onChange={setPage} />
        )}
      </div>

      {/* ── Edit Modal ──────────────────────────────────────────── */}
      <Modal
        open={!!editingUser}
        onClose={() => { setEditingUser(null); reset() }}
        title={`Modifier — ${editingUser?.prenom} ${editingUser?.nom}`}
      >
        <form onSubmit={handleSubmit(d => editingUser && editUser.mutate({ id: editingUser.id, body: d }))} className="space-y-4">
          {editUser.isError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-xl">
              Erreur lors de la modification
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom" {...register('prenom', { required: 'Requis' })} error={errors.prenom?.message} />
            <Input label="Nom" {...register('nom', { required: 'Requis' })} error={errors.nom?.message} />
          </div>
          <Input label="Email" type="email" {...register('email', { required: 'Requis' })} error={errors.email?.message} />
          <Input label="Téléphone" {...register('telephone')} placeholder="+237 6XX XXX XXX" />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => { setEditingUser(null); reset() }}>Annuler</Button>
            <Button type="submit" loading={editUser.isPending}>Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* ── Detail Panel (slide-over) ───────────────────────────── */}
      {detailUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailUser(null)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                  {detailUser.prenom?.[0]}{detailUser.nom?.[0]}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{detailUser.prenom} {detailUser.nom}</p>
                  <p className="text-xs text-slate-500">{detailUser.email}</p>
                </div>
              </div>
              <button onClick={() => setDetailUser(null)} className="p-2 rounded-xl hover:bg-slate-200 transition-colors">
                <X size={16} className="text-slate-500" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Rôle', value: <Badge label={detailUser.role} /> },
                  { label: 'Statut', value: detailUser.isBanned ? <Badge label="banned" /> : <Badge label="active" /> },
                  { label: 'Vérifié', value: detailUser.isVerified ? '✓ Oui' : '✗ Non' },
                  { label: 'Inscrit le', value: fmtDate(detailUser.createdAt) },
                  { label: 'Téléphone', value: detailUser.telephone ?? '—' },
                  { label: 'Commandes', value: String(detailUser._count?.orders ?? 0) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                    <div className="text-sm font-medium text-slate-900">{value}</div>
                  </div>
                ))}
              </div>

              {/* Orders */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package size={15} className="text-indigo-600" />
                  <h3 className="font-semibold text-slate-800 text-sm">Dernières commandes</h3>
                </div>
                {detailLoading ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
                  </div>
                ) : !detail?.orders?.length ? (
                  <div className="bg-slate-50 rounded-xl p-6 text-center">
                    <Package size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">Aucune commande</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detail.orders.map((o: Order) => (
                      <div key={o.id} className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-mono font-bold text-slate-700">{o.orderNumber}</p>
                          <p className="text-xs text-slate-400">{fmtDate(o.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">{o.total.toLocaleString('fr-FR')} FCFA</p>
                          <Badge label={o.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button onClick={() => { openEdit(detailUser); setDetailUser(null) }}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700">
                  <Edit size={14} className="text-slate-400" /> Modifier le profil
                </button>
                <button onClick={() => { setConfirmBan(detailUser); setDetailUser(null) }}
                  className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors text-sm font-medium ${
                    detailUser.isBanned
                      ? 'border-green-200 hover:bg-green-50 text-green-700'
                      : 'border-red-200 hover:bg-red-50 text-red-600'
                  }`}>
                  {detailUser.isBanned
                    ? <><UserCheck size={14} /> Débannir l'utilisateur</>
                    : <><Ban size={14} /> Bannir l'utilisateur</>
                  }
                </button>
                <button onClick={() => { setConfirmDelete(detailUser); setDetailUser(null) }}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-red-100 hover:bg-red-50 transition-colors text-sm font-medium text-red-500">
                  <Trash2 size={14} /> Supprimer le compte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmations ──────────────────────────────────────── */}
      <Confirm
        open={!!confirmAdmin}
        onClose={() => setConfirmAdmin(null)}
        onConfirm={() => confirmAdmin && toggleRole.mutate(confirmAdmin)}
        loading={toggleRole.isPending}
        title={confirmAdmin?.role === 'admin' ? 'Rétrograder en client ?' : 'Promouvoir en administrateur ?'}
        message={`${confirmAdmin?.prenom} ${confirmAdmin?.nom} (${confirmAdmin?.email})`}
        confirmLabel={confirmAdmin?.role === 'admin' ? 'Rétrograder' : 'Promouvoir'}
      />

      <Confirm
        open={!!confirmBan}
        onClose={() => setConfirmBan(null)}
        onConfirm={() => confirmBan && toggleBan.mutate(confirmBan)}
        loading={toggleBan.isPending}
        title={confirmBan?.isBanned ? 'Débannir cet utilisateur ?' : 'Bannir cet utilisateur ?'}
        message={confirmBan?.isBanned
          ? `${confirmBan.prenom} ${confirmBan.nom} pourra de nouveau accéder à son compte.`
          : `${confirmBan?.prenom} ${confirmBan?.nom} ne pourra plus se connecter ni passer de commande.`
        }
        confirmLabel={confirmBan?.isBanned ? 'Débannir' : 'Bannir'}
      />

      <Confirm
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteUser.mutate(confirmDelete.id)}
        loading={deleteUser.isPending}
        title="Supprimer définitivement ce compte ?"
        message={`Cette action est irréversible. Toutes les données de ${confirmDelete?.prenom} ${confirmDelete?.nom} seront supprimées.`}
        confirmLabel="Supprimer"
      />
    </div>
  )
}
