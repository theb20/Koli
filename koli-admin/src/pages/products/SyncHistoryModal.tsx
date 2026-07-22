import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Download, ChevronDown, ChevronRight, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { api, fmtDate } from '../../lib/api'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import type { MerchantSyncRun } from '../../types'

type Props = { open: boolean; onClose: () => void }

function duration(run: MerchantSyncRun): string {
  if (!run.finishedAt) return '—'
  const ms = new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
  return ms < 1000 ? '<1s' : `${Math.round(ms / 1000)}s`
}

export function SyncHistoryModal({ open, onClose }: Props) {
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['merchant-sync-runs', page],
    queryFn: async () => {
      const { data } = await api.get(`/api/products/sync-merchant/runs?page=${page}&limit=10`)
      return data as { data: MerchantSyncRun[]; pagination: { page: number; pages: number; total: number } }
    },
    enabled: open,
  })

  const { data: detail } = useQuery({
    queryKey: ['merchant-sync-run', expandedId],
    queryFn: async () => { const { data } = await api.get(`/api/products/sync-merchant/runs/${expandedId}`); return data.data as MerchantSyncRun },
    enabled: !!expandedId,
  })

  const csvMutation = useMutation({
    mutationFn: async (runId: string) => {
      const { data } = await api.get(`/api/products/sync-merchant/runs/${runId}/export.csv`, { responseType: 'blob' })
      return { blob: data as Blob, runId }
    },
    onSuccess: ({ blob, runId }) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sync-merchant-${runId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
  })

  const runs = data?.data ?? []

  return (
    <Modal open={open} onClose={onClose} title="Historique des synchronisations" width="max-w-3xl">
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : runs.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">Aucune synchronisation pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {runs.map(run => (
            <div key={run.id} className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left"
              >
                {expandedId === run.id ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">{fmtDate(run.startedAt)} · <span className="text-slate-500">{run.mode === 'full' ? 'Tous les produits' : 'Sélection'}</span></p>
                  <p className="text-xs text-slate-400 truncate">{run.actorEmail ?? 'Système'} · {duration(run)}</p>
                </div>
                <Badge label={run.status === 'running' ? 'running' : run.failedCount > 0 ? 'failed' : 'success'} />
                <span className="text-xs text-slate-500 shrink-0">{run.succeeded}/{run.total}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); csvMutation.mutate(run.id) }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 shrink-0"
                  title="Export CSV"
                >
                  <Download size={14} />
                </button>
              </button>

              {expandedId === run.id && detail && (
                <div className="border-t border-slate-100 max-h-60 overflow-y-auto divide-y divide-slate-50">
                  {(detail.items ?? []).map(item => (
                    <div key={item.id} className="flex items-start gap-2 px-4 py-2 text-sm">
                      {item.status === 'success' && <CheckCircle2 size={13} className="mt-0.5 text-emerald-500 shrink-0" />}
                      {item.status === 'failed' && <XCircle size={13} className="mt-0.5 text-red-500 shrink-0" />}
                      {item.status === 'skipped' && <AlertTriangle size={13} className="mt-0.5 text-slate-400 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-slate-700">{item.productName}</p>
                        {item.error && <p className="text-xs text-red-600">{item.error}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {data && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="disabled:opacity-40 hover:text-slate-900">Précédent</button>
          <span>Page {page} / {data.pagination.pages}</span>
          <button disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)} className="disabled:opacity-40 hover:text-slate-900">Suivant</button>
        </div>
      )}
    </Modal>
  )
}
