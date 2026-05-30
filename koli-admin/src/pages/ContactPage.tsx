import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Mail, MailOpen, Trash2 } from 'lucide-react'
import { api, fmtDateTime } from '../lib/api'
import { Modal, Confirm } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { PageTitle } from '../components/layout/Sidebar'
import type { ContactMessage } from '../types'

async function fetchMessages(page: number) {
  const { data } = await api.get(`/api/contact/admin/all?page=${page}&limit=20`)
  return data.data
}

export default function ContactPage() {
  const qc = useQueryClient()
  const [page, setPage]         = useState(1)
  const [selected, setSelected] = useState<ContactMessage | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['contact-admin', page],
    queryFn: () => fetchMessages(page),
    placeholderData: (prev) => prev,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/api/contact/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-admin'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/contact/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contact-admin'] }); setDeleteId(null) },
  })

  const messages: ContactMessage[] = data?.messages ?? []
  const unread = messages.filter(m => m.status === 'new').length

  const openMsg = (m: ContactMessage) => {
    setSelected(m)
    if (m.status === 'new') markRead.mutate(m.id)
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Messages de contact" sub={`${unread} non lu(s)`} />

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['', 'Expéditeur', 'Sujet', 'Message', 'Date', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-8 bg-slate-100 rounded-lg animate-pulse" /></td></tr>
              ))
            ) : messages.length === 0 ? (
              <tr><td colSpan={6} className="py-16 text-center">
                <MessageSquare size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Aucun message</p>
              </td></tr>
            ) : (
              messages.map(m => (
                <tr key={m.id}
                  onClick={() => openMsg(m)}
                  className={`hover:bg-slate-50 transition-colors cursor-pointer group ${m.status === 'new' ? 'bg-indigo-50/40' : ''}`}>
                  <td className="px-4 py-3 w-8">
                    {m.status !== 'new'
                      ? <MailOpen size={14} className="text-slate-400" />
                      : <Mail size={14} className="text-indigo-600" />}
                  </td>
                  <td className="px-4 py-3">
                    <p className={`text-sm ${m.status === 'new' ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                      {m.prenom} {m.nom}
                    </p>
                    <p className="text-xs text-slate-400">{m.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{m.sujet}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 max-w-sm truncate">{m.message}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fmtDateTime(m.createdAt)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setDeleteId(m.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
                      <Trash2 size={14} />
                    </button>
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

      {/* View message modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.sujet ?? ''} width="max-w-2xl">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                {selected.prenom[0]}
              </div>
              <div>
                <p className="font-medium text-slate-900">{selected.prenom} {selected.nom}</p>
                <a href={`mailto:${selected.email}`} className="text-sm text-indigo-600 hover:underline">{selected.email}</a>
                {selected.telephone && <p className="text-xs text-slate-500 mt-0.5">{selected.telephone}</p>}
              </div>
              <p className="ml-auto text-xs text-slate-400">{fmtDateTime(selected.createdAt)}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 min-h-[150px]">
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selected.message}</p>
            </div>
            <div className="flex justify-end">
              <a href={`mailto:${selected.email}?subject=Re: ${selected.sujet}`}
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all">
                ↩ Répondre par email
              </a>
            </div>
          </div>
        )}
      </Modal>

      <Confirm
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        title="Supprimer ce message ?"
        message="Le message sera définitivement supprimé."
      />
    </div>
  )
}
