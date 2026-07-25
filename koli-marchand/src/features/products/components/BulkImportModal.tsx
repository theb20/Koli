import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, FileText, CheckCircle2, XCircle, ArrowLeft, Download, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

type BulkRow = {
  name: string
  brand?: string
  category: string
  price: number
  oldPrice?: number
  stock: number
  description?: string
  images: string[]
}

type SkippedRow = { row: number; reason: string }

type PreviewResult = { valid: { row: number; data: BulkRow }[]; skipped: SkippedRow[]; total: number }
type CommitResult  = { created: number; skipped: SkippedRow[]; total: number }

function errorMessage(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback
}

export function BulkImportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile]         = useState<File | null>(null)
  const [preview, setPreview]   = useState<PreviewResult | null>(null)
  const [result, setResult]     = useState<CommitResult | null>(null)
  const [excluded, setExcluded] = useState<Set<number>>(new Set())

  const reset = () => { setFile(null); setPreview(null); setResult(null); setExcluded(new Set()) }
  const handleClose = () => { reset(); onClose() }

  const previewMutation = useMutation({
    mutationFn: async (f: File) => {
      const fd = new FormData()
      fd.append('file', f)
      const { data } = await api.post('/api/seller/products/bulk-import/preview', fd)
      return data.data as PreviewResult
    },
    onSuccess: (data) => setPreview(data),
  })

  const commitMutation = useMutation({
    mutationFn: async () => {
      const rows = (preview?.valid ?? [])
        .filter(v => !excluded.has(v.row))
        .map(v => v.data)
      const { data } = await api.post('/api/seller/products/bulk-import/commit', { rows })
      return data.data as CommitResult
    },
    onSuccess: (data) => {
      setResult(data)
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const onFileChange = (f: File | null) => {
    setFile(f)
    setPreview(null)
    setResult(null)
    setExcluded(new Set())
    if (f) previewMutation.mutate(f)
  }

  const templateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.get('/api/seller/products/bulk-import/template', { responseType: 'blob' })
      return data as Blob
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'modele-import-produits.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    },
  })

  const toggleExcluded = (row: number) => {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(row)) next.delete(row); else next.add(row)
      return next
    })
  }

  const includedCount = (preview?.valid.length ?? 0) - excluded.size

  return (
    <Modal title="Importer plusieurs produits" onClose={handleClose} size="lg">
      <div className="space-y-4">
        {/* Étape 1 — pas de fichier choisi */}
        {!file && (
          <>
            <p className="text-sm text-[#6b6b68]">
              Importez plusieurs produits d'un coup à partir d'un fichier Excel (.xlsx) ou CSV. Rien n'est enregistré tant que vous n'avez pas vérifié et confirmé l'aperçu.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-[#e8e8e4] rounded-2xl py-10 flex flex-col items-center gap-2 text-[#a3a3a1] hover:border-[#1E90FF]/40 hover:text-[#1E90FF] hover:bg-[#1E90FF]/5 transition-all"
            >
              <Upload size={26} />
              <span className="text-sm font-medium">Cliquez pour choisir un fichier Excel (.xlsx) ou CSV</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={e => onFileChange(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => templateMutation.mutate()}
              disabled={templateMutation.isPending}
              className="flex items-center gap-1.5 text-xs text-[#1E90FF] hover:underline disabled:opacity-50"
            >
              {templateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Télécharger le modèle Excel (avec catégories pré-remplies)
            </button>
            {templateMutation.isError && (
              <p className="text-xs text-rose-600">Erreur lors du téléchargement du modèle, réessayez.</p>
            )}
          </>
        )}

        {/* Chargement de l'aperçu */}
        {file && previewMutation.isPending && (
          <div className="py-16 text-center text-sm text-[#a3a3a1]">Analyse du fichier…</div>
        )}

        {/* Erreur d'analyse (fichier invalide, trop de lignes...) */}
        {file && previewMutation.isError && (
          <div className="space-y-3">
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
              {errorMessage(previewMutation.error, "Erreur lors de l'analyse du fichier")}
            </div>
            <Button variant="secondary" icon={<ArrowLeft size={13} />} onClick={reset}>Choisir un autre fichier</Button>
          </div>
        )}

        {/* Étape 2 — aperçu, avant confirmation */}
        {preview && !result && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <CheckCircle2 size={15} /> {preview.valid.length} ligne(s) valide(s)
              </span>
              {preview.skipped.length > 0 && (
                <span className="flex items-center gap-1.5 text-rose-600 font-medium">
                  <XCircle size={15} /> {preview.skipped.length} ligne(s) ignorée(s)
                </span>
              )}
              <span className="text-[#a3a3a1]">sur {preview.total} au total</span>
            </div>

            <div className="max-h-72 overflow-y-auto border border-[#e8e8e4] rounded-xl divide-y divide-[#f0f0ed]">
              {preview.valid.map(v => (
                <label key={v.row} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f5f5f3] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!excluded.has(v.row)}
                    onChange={() => toggleExcluded(v.row)}
                    className="w-4 h-4 rounded accent-[#1E90FF] shrink-0"
                  />
                  <span className="text-xs text-[#a3a3a1] w-10 shrink-0">L{v.row}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#0a0a0b] truncate">{v.data.name}</p>
                    <p className="text-xs text-[#a3a3a1]">{v.data.category} · {v.data.price.toLocaleString('fr-FR')} FCFA · {v.data.images.length} image(s)</p>
                  </div>
                </label>
              ))}
              {preview.skipped.map(s => (
                <div key={s.row} className="flex items-center gap-3 px-4 py-2.5 bg-rose-50/40">
                  <XCircle size={15} className="text-rose-400 shrink-0" />
                  <span className="text-xs text-[#a3a3a1] w-10 shrink-0">L{s.row}</span>
                  <p className="text-xs text-rose-600">{s.reason}</p>
                </div>
              ))}
            </div>

            {commitMutation.isError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
                {errorMessage(commitMutation.error, "Erreur lors de l'import")}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button variant="secondary" icon={<ArrowLeft size={13} />} onClick={reset}>Choisir un autre fichier</Button>
              <Button
                icon={<FileText size={14} />}
                disabled={includedCount === 0}
                isLoading={commitMutation.isPending}
                onClick={() => commitMutation.mutate()}
              >
                Téléverser {includedCount} produit{includedCount > 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}

        {/* Étape 3 — résultat de l'import */}
        {result && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 size={16} /> {result.created} produit(s) créé(s) avec succès.
            </div>
            {result.skipped.length > 0 && (
              <div className="border border-[#e8e8e4] rounded-xl divide-y divide-[#f0f0ed] max-h-48 overflow-y-auto">
                {result.skipped.map(s => (
                  <div key={s.row} className="flex items-center gap-3 px-4 py-2 bg-rose-50/40">
                    <XCircle size={13} className="text-rose-400 shrink-0" />
                    <p className="text-xs text-rose-600">Ligne {s.row} — {s.reason}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={handleClose}>Terminé</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
