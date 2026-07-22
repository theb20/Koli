import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Download, RotateCcw, ChevronDown } from 'lucide-react'
import { api } from '../../lib/api'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import type { MerchantPreviewItem, MerchantSyncRun } from '../../types'

type Props = {
  open: boolean
  onClose: () => void
  selectedIds: number[]
  onDone: () => void
}

type Phase = 'setup' | 'preview' | 'running' | 'result'

function errorMessage(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback
}

export function SyncMerchantModal({ open, onClose, selectedIds, onDone }: Props) {
  const qc = useQueryClient()
  const [phase, setPhase]       = useState<Phase>('setup')
  const [mode, setMode]         = useState<'full' | 'selected'>(selectedIds.length > 0 ? 'selected' : 'full')
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [runId, setRunId]       = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const reset = () => {
    setPhase('setup')
    setMode(selectedIds.length > 0 ? 'selected' : 'full')
    setExcluded(new Set())
    setRunId(null)
  }
  const handleClose = () => { reset(); onClose() }

  const { data: lockData } = useQuery({
    queryKey: ['merchant-sync-lock'],
    queryFn: async () => { const { data } = await api.get('/api/products/sync-merchant/lock'); return data.data as { running: boolean } },
    enabled: open && phase === 'setup',
    refetchInterval: open && phase === 'setup' ? 3000 : false,
  })

  const previewMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/products/sync-merchant/preview', {
        productIds: mode === 'selected' ? selectedIds : undefined,
      })
      return data.data as { total: number; validCount: number; items: MerchantPreviewItem[] }
    },
    onSuccess: () => setPhase('preview'),
  })

  const includedIds = (previewMutation.data?.items ?? [])
    .filter(i => i.valid && !excluded.has(i.productId))
    .map(i => i.productId)

  const startMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/products/sync-merchant/start', {
        mode: 'selected',
        productIds: includedIds,
      })
      return data.data as { runId: string }
    },
    onSuccess: ({ runId }) => { setRunId(runId); setPhase('running') },
  })

  const { data: run } = useQuery({
    queryKey: ['merchant-sync-run', runId],
    queryFn: async () => { const { data } = await api.get(`/api/products/sync-merchant/runs/${runId}`); return data.data as MerchantSyncRun },
    enabled: !!runId,
    refetchInterval: (q) => (q.state.data?.status === 'running' ? 1200 : false),
  })

  // La phase affichée dérive du statut de la run plutôt que d'être poussée
  // par un effet — évite un setState en cascade dans un useEffect pour une
  // simple transition "running" → "result".
  const displayPhase: Phase = phase === 'running' && run && run.status !== 'running' ? 'result' : phase

  const notifiedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (run && run.status !== 'running' && runId && !notifiedRef.current.has(runId)) {
      notifiedRef.current.add(runId)
      qc.invalidateQueries({ queryKey: ['products'] })
      onDone()
    }
  }, [run, runId, qc, onDone])

  const retryMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/products/sync-merchant/runs/${runId}/retry`)
      return data.data as { runId: string }
    },
    onSuccess: ({ runId: newRunId }) => { setRunId(newRunId); setPhase('running') },
  })

  const csvMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.get(`/api/products/sync-merchant/runs/${runId}/export.csv`, { responseType: 'blob' })
      return data as Blob
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sync-merchant-${runId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
  })

  const toggleExcluded = (productId: number) => {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId); else next.add(productId)
      return next
    })
  }

  const title = displayPhase === 'setup' ? 'Synchroniser avec Google Merchant Center'
    : displayPhase === 'preview' ? 'Vérification avant envoi'
    : displayPhase === 'running' ? 'Synchronisation en cours'
    : 'Résultat de la synchronisation'

  return (
    <Modal open={open} onClose={handleClose} title={title} width="max-w-2xl">
      {displayPhase === 'setup' && (
        <div className="space-y-4">
          {lockData?.running && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
              <AlertTriangle size={15} className="shrink-0" />
              Une synchronisation est déjà en cours — patientez avant d'en lancer une nouvelle.
            </div>
          )}

          <div className="space-y-2">
            <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${mode === 'selected' ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200'} ${selectedIds.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
              <input type="radio" checked={mode === 'selected'} onChange={() => setMode('selected')} className="accent-indigo-600" disabled={selectedIds.length === 0} />
              <div>
                <p className="text-sm font-medium text-slate-900">Produits sélectionnés ({selectedIds.length})</p>
                <p className="text-xs text-slate-500">Uniquement les produits cochés dans le tableau.</p>
              </div>
            </label>
            <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${mode === 'full' ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200'}`}>
              <input type="radio" checked={mode === 'full'} onChange={() => setMode('full')} className="accent-indigo-600" />
              <div>
                <p className="text-sm font-medium text-slate-900">Tous les produits actifs</p>
                <p className="text-xs text-slate-500">Synchronisation complète du catalogue publié.</p>
              </div>
            </label>
          </div>

          <div>
            <button onClick={() => setShowAdvanced(v => !v)} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">
              <ChevronDown size={14} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              Paramètres avancés
            </button>
            {showAdvanced && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div>Devise : <span className="text-slate-800 font-medium">XOF (Franc CFA)</span></div>
                <div>Langue : <span className="text-slate-800 font-medium">fr</span></div>
                <div>Pays / feed label : <span className="text-slate-800 font-medium">configuré côté serveur</span></div>
                <div>Livraison : <span className="text-slate-800 font-medium">gérée dans Merchant Center</span></div>
              </div>
            )}
          </div>

          {previewMutation.isError && (
            <p className="text-sm text-red-600">{errorMessage(previewMutation.error, 'Erreur lors de la validation')}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={handleClose}>Annuler</Button>
            <Button loading={previewMutation.isPending} disabled={lockData?.running} onClick={() => previewMutation.mutate()}>
              Vérifier les produits
            </Button>
          </div>
        </div>
      )}

      {displayPhase === 'preview' && previewMutation.data && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">{previewMutation.data.total} produit(s) analysé(s)</span>
            <span className="text-emerald-600 font-medium">{includedIds.length} seront envoyés</span>
            {previewMutation.data.total - previewMutation.data.validCount > 0 && (
              <span className="text-red-600 font-medium">{previewMutation.data.total - previewMutation.data.validCount} bloqué(s)</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            {previewMutation.data.items.map(item => (
              <div key={item.productId} className="flex items-start gap-3 px-3 py-2.5">
                {item.valid ? (
                  <input
                    type="checkbox"
                    checked={!excluded.has(item.productId)}
                    onChange={() => toggleExcluded(item.productId)}
                    className="mt-0.5 w-4 h-4 rounded accent-indigo-600 shrink-0"
                  />
                ) : (
                  <XCircle size={16} className="mt-0.5 text-red-500 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-900 truncate">{item.name}</p>
                  {item.errors.length > 0 && <p className="text-xs text-red-600">{item.errors.join(' · ')}</p>}
                  {item.warnings.length > 0 && <p className="text-xs text-amber-600">{item.warnings.join(' · ')}</p>}
                </div>
              </div>
            ))}
          </div>

          {startMutation.isError && (
            <p className="text-sm text-red-600">{errorMessage(startMutation.error, 'Erreur lors du lancement')}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setPhase('setup')}>Retour</Button>
            <Button loading={startMutation.isPending} disabled={includedIds.length === 0} onClick={() => startMutation.mutate()}>
              Lancer la synchronisation ({includedIds.length})
            </Button>
          </div>
        </div>
      )}

      {displayPhase === 'running' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 size={16} className="animate-spin text-indigo-600" />
            Synchronisation en cours…
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${run && run.total > 0 ? ((run.succeeded + run.failedCount + run.skippedCount) / run.total) * 100 : 5}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {run ? `${run.succeeded + run.failedCount + run.skippedCount} / ${run.total} produits traités` : 'Démarrage…'}
          </p>
          <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            {(run?.items ?? []).slice().reverse().map(item => (
              <div key={item.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                {item.status === 'success' && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                {item.status === 'failed' && <XCircle size={14} className="text-red-500 shrink-0" />}
                {item.status === 'skipped' && <AlertTriangle size={14} className="text-slate-400 shrink-0" />}
                <span className="truncate text-slate-700">{item.productName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {displayPhase === 'result' && run && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge label="success" />
            <span className="text-sm text-slate-700">{run.succeeded} synchronisé(s)</span>
            {run.failedCount > 0 && <><Badge label="failed" /><span className="text-sm text-slate-700">{run.failedCount} échec(s)</span></>}
            {run.skippedCount > 0 && <><Badge label="skipped" /><span className="text-sm text-slate-700">{run.skippedCount} ignoré(s)</span></>}
          </div>

          <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            {(run.items ?? []).map(item => (
              <div key={item.id} className="flex items-start gap-2 px-3 py-2 text-sm">
                {item.status === 'success' && <CheckCircle2 size={14} className="mt-0.5 text-emerald-500 shrink-0" />}
                {item.status === 'failed' && <XCircle size={14} className="mt-0.5 text-red-500 shrink-0" />}
                {item.status === 'skipped' && <AlertTriangle size={14} className="mt-0.5 text-slate-400 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-slate-800">{item.productName}</p>
                  {item.error && <p className="text-xs text-red-600">{item.error}</p>}
                </div>
              </div>
            ))}
          </div>

          {retryMutation.isError && (
            <p className="text-sm text-red-600">{errorMessage(retryMutation.error, 'Erreur lors de la relance')}</p>
          )}

          <div className="flex justify-end gap-2 pt-2 flex-wrap">
            <Button variant="secondary" icon={<Download size={14} />} loading={csvMutation.isPending} onClick={() => csvMutation.mutate()}>
              Export CSV
            </Button>
            {run.failedCount > 0 && (
              <Button variant="secondary" icon={<RotateCcw size={14} />} loading={retryMutation.isPending} onClick={() => retryMutation.mutate()}>
                Relancer les échecs
              </Button>
            )}
            <Button onClick={handleClose}>Fermer</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
