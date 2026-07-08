import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Send, Trash2, AlertTriangle, CheckCircle2, Info, AlertOctagon } from 'lucide-react'
import { api, fmtDateTime } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input, Textarea, Select } from '../components/ui/Input'
import { Confirm } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { PageTitle } from '../components/layout/Sidebar'

type Notification = {
  id: string
  title: string
  body: string
  type: 'info' | 'success' | 'warning' | 'error' | 'order'
  isRead: boolean
  createdAt: string
  user?: { id: number; prenom: string; nom: string; email: string }
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  info:    <Info size={13} className="text-blue-500" />,
  success: <CheckCircle2 size={13} className="text-green-500" />,
  warning: <AlertTriangle size={13} className="text-yellow-500" />,
  error:   <AlertOctagon size={13} className="text-red-500" />,
  order:   <Bell size={13} className="text-indigo-500" />,
}

const NOTIF_TYPES = [
  { value: 'info',    label: 'Information' },
  { value: 'success', label: 'Succès' },
  { value: 'warning', label: 'Avertissement' },
  { value: 'error',   label: 'Erreur' },
  { value: 'order',   label: 'Commande' },
]

async function fetchAllNotifs(page: number) {
  const { data } = await api.get(`/api/notifications/admin/all?page=${page}&limit=30`)
  return data.data as { notifications: Notification[]; unread: number; pagination: { total: number; totalPages: number } }
}

export default function NotificationsPage() {
  const qc              = useQueryClient()
  const [page, setPage] = useState(1)
  const [confirmClear, setConfirmClear] = useState(false)
  const [title, setTitle]   = useState('')
  const [message, setMessage] = useState('')
  const [type, setType]     = useState<string>('info')
  const [sent, setSent]     = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['notifs-admin', page],
    queryFn: () => fetchAllNotifs(page),
    placeholderData: (prev) => prev,
    refetchInterval: 15_000,
  })

  const broadcastMutation = useMutation({
    mutationFn: () => api.post('/api/notifications/broadcast', { title, message, type }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifs-admin'] })
      setSent(true); setTitle(''); setMessage('')
      setTimeout(() => setSent(false), 3000)
    },
  })

  const clearMutation = useMutation({
    mutationFn: () => api.delete('/api/notifications/admin/clear'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifs-admin'] }); setConfirmClear(false) },
  })

  const notifs: Notification[] = data?.notifications ?? []

  // Marque les notifications de l'admin connecté comme lues à la visite — vide la bulle du menu
  useEffect(() => {
    api.put('/api/notifications/read-all').then(() => {
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      <PageTitle
        title="Notifications"
        sub={`${data?.pagination?.total ?? 0} notifications · ${data?.unread ?? 0} non lues`}
        action={
          <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setConfirmClear(true)}>
            Tout supprimer
          </Button>
        }
      />

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: data?.pagination?.total ?? 0, color: 'text-slate-900' },
          { label: 'Non lues', value: data?.unread ?? 0, color: 'text-amber-600' },
          { label: 'Lues', value: (data?.pagination?.total ?? 0) - (data?.unread ?? 0), color: 'text-green-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Broadcast */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-indigo-50"><Send size={15} className="text-indigo-600" /></div>
          <h2 className="text-sm font-semibold text-slate-900">Envoyer une notification à tous les clients</h2>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input
                label="Titre"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Nouvelle promotion disponible !"
              />
            </div>
            <Select
              label="Type"
              value={type}
              onChange={e => setType(e.target.value)}
              options={NOTIF_TYPES}
            />
          </div>
          <Textarea
            label="Message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            placeholder="Contenu de la notification..."
          />
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-amber-600 flex items-center gap-1.5 font-medium">
              <AlertTriangle size={12} />
              Sera envoyée à tous les utilisateurs inscrits
            </p>
            <div className="flex items-center gap-3">
              {sent && <span className="text-green-600 text-sm font-medium">✓ Envoyée avec succès</span>}
              <Button
                onClick={() => broadcastMutation.mutate()}
                loading={broadcastMutation.isPending}
                disabled={!title.trim() || !message.trim()}
                icon={<Send size={14} />}
              >
                Envoyer
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table historique */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Historique des notifications</h3>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['Type', 'Titre', 'Message', 'Destinataire', 'Lu', 'Date'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-8 bg-slate-100 rounded-lg animate-pulse" /></td></tr>
              ))
            ) : notifs.length === 0 ? (
              <tr><td colSpan={6} className="py-16 text-center">
                <Bell size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Aucune notification</p>
              </td></tr>
            ) : (
              notifs.map(n => (
                <tr key={n.id} className={`transition-colors ${!n.isRead ? 'bg-amber-50/40' : 'hover:bg-slate-50'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100">
                      {TYPE_ICONS[n.type] ?? TYPE_ICONS['info']}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-[160px] truncate">{n.title}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 max-w-[220px] truncate">{n.body}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {n.user
                      ? <span>{n.user.prenom} {n.user.nom}<br /><span className="text-slate-400">{n.user.email}</span></span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {n.isRead
                      ? <span className="text-green-600 font-medium">✓ Lu</span>
                      : <span className="text-amber-500 font-medium">Non lu</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDateTime(n.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {data?.pagination && data.pagination.totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            limit={30}
            onChange={setPage}
          />
        )}
      </div>

      <Confirm
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => clearMutation.mutate()}
        loading={clearMutation.isPending}
        title="Supprimer toutes les notifications ?"
        message="Cette action est irréversible. Toutes les notifications de tous les utilisateurs seront supprimées."
      />
    </div>
  )
}
