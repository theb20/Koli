import { useState } from 'react'
import { motion } from 'motion/react'
import { AlertCircle, Loader2, X, ImagePlus, Trash2 } from 'lucide-react'
import { API_BASE, type ApiOrder } from '../../lib/api'

const fmt = (n: number) =>
  Math.round(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'

const REASONS: { value: string; label: string }[] = [
  { value: 'defective',         label: 'Article défectueux' },
  { value: 'wrong_item',        label: 'Mauvais article reçu' },
  { value: 'not_as_described',  label: "Ne correspond pas à la description" },
  { value: 'no_longer_needed',  label: "Je n'en ai plus besoin" },
  { value: 'other',             label: 'Autre raison' },
]

type Props = {
  order: ApiOrder
  token: string | null
  onClose: () => void
  onSuccess: () => void
}

export function ReturnRequestModal({ order, token, onClose, onSuccess }: Props) {
  const [selected, setSelected] = useState<Record<number, number>>({})
  const [reason, setReason]     = useState('defective')
  const [comment, setComment]   = useState('')
  const [photos, setPhotos]     = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')

  const toggleItem = (itemId: number, maxQty: number) => {
    setSelected(prev => {
      const next = { ...prev }
      if (next[itemId] !== undefined) delete next[itemId]
      else next[itemId] = maxQty
      return next
    })
  }

  const setQty = (itemId: number, qty: number, maxQty: number) => {
    setSelected(prev => ({ ...prev, [itemId]: Math.min(Math.max(1, qty), maxQty) }))
  }

  const addPhotos = (files: FileList | null) => {
    if (!files) return
    setPhotos(prev => [...prev, ...Array.from(files)].slice(0, 4))
  }
  const removePhoto = (name: string) => setPhotos(prev => prev.filter(f => f.name !== name))

  const selectedIds = Object.keys(selected).map(Number)

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      setError('Sélectionnez au moins un article à retourner')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      let photoUrls: string[] = []
      if (photos.length > 0) {
        setUploading(true)
        const fd = new FormData()
        photos.forEach(p => fd.append('images', p))
        const uploadRes = await fetch(`${API_BASE}/api/returns/upload-images`, {
          method: 'POST',
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: fd,
        })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) throw new Error(uploadData.message ?? "Échec de l'envoi des photos")
        photoUrls = uploadData.data.urls
        setUploading(false)
      }

      const res = await fetch(`${API_BASE}/api/returns`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          orderId: order.id,
          items: selectedIds.map(id => ({ orderItemId: id, quantity: selected[id] })),
          reason,
          customerComment: comment.trim() || undefined,
          photos: photoUrls.length > 0 ? photoUrls : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Erreur lors de la demande de retour')
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la demande de retour')
    } finally {
      setSubmitting(false)
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-base font-bold text-gray-900">Demander un retour</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Articles à retourner</p>
            <div className="space-y-2">
              {order.items.map(item => {
                const checked = selected[item.id] !== undefined
                return (
                  <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${checked ? 'border-blue-300 bg-blue-50/50' : 'border-gray-100'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(item.id, item.qty)}
                      className="w-4 h-4 rounded accent-blue-600 shrink-0"
                    />
                    <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover bg-gray-50 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{fmt(item.price)} · Acheté ×{item.qty}</p>
                    </div>
                    {checked && item.qty > 1 && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setQty(item.id, (selected[item.id] ?? 1) - 1, item.qty)}
                          className="w-6 h-6 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50">−</button>
                        <span className="text-sm font-semibold w-5 text-center">{selected[item.id]}</span>
                        <button onClick={() => setQty(item.id, (selected[item.id] ?? 1) + 1, item.qty)}
                          className="w-6 h-6 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50">+</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Motif du retour</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400"
            >
              {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Précisions (optionnel)</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Décrivez le problème rencontré..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Photos (optionnel, 4 max)</label>
            <div className="flex flex-wrap gap-2">
              {photos.map(p => (
                <div key={p.name} className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-200 group">
                  <img src={URL.createObjectURL(p)} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removePhoto(p.name)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Trash2 size={14} className="text-white" />
                  </button>
                </div>
              ))}
              {photos.length < 4 && (
                <label className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-gray-300 hover:text-gray-400 cursor-pointer transition-colors">
                  <ImagePlus size={18} />
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="hidden"
                    onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
                </label>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:border-gray-300 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedIds.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            {uploading ? 'Envoi des photos…' : submitting ? 'Envoi…' : 'Envoyer la demande'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
