import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, GripVertical,
  ToggleLeft, ToggleRight, Tag, X, Check, AlertTriangle, Upload, ImageIcon,
} from 'lucide-react'
import { api } from '../../lib/api'
import { PageTitle } from '../../components/layout/Sidebar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import type { Category } from '../../types'

/* ── Types ─────────────────────────────────────────────────────── */
type FormData = {
  slug: string; name: string; description: string
  icon: string; image: string; tag: string
  position: number; isActive: boolean
  imageFile?: File
}

const EMPTY: FormData = {
  slug: '', name: '', description: '', icon: '', image: '', tag: '', position: 0, isActive: true,
}

function slugify(s: string) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/* ── Image Picker ──────────────────────────────────────────────── */
function ImagePicker({
  currentUrl,
  onUrlChange,
  onFileChange,
  preview,
}: {
  currentUrl: string
  onUrlChange: (url: string) => void
  onFileChange: (file: File, localUrl: string) => void
  preview: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const local = URL.createObjectURL(file)
    onFileChange(file, local)
  }

  return (
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1 block">Image</label>
      <div className="flex gap-3 items-start">
        {/* Preview */}
        <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
          {preview
            ? <img src={preview} alt="" className="w-full h-full object-cover" />
            : <ImageIcon size={24} className="text-slate-300" />
          }
        </div>
        {/* Controls */}
        <div className="flex-1 space-y-2">
          <input
            value={preview.startsWith('blob:') ? '' : currentUrl}
            onChange={e => onUrlChange(e.target.value)}
            placeholder="https://... (URL externe)"
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
          >
            <Upload size={12} /> Uploader depuis l'ordinateur
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      </div>
    </div>
  )
}

/* ── Category Modal ───────────────────────────────────────────── */
function CategoryModal({
  cat, onClose, onSave, saving,
}: {
  cat: Category | null
  onClose: () => void
  onSave: (data: FormData) => void
  saving: boolean
}) {
  const [form, setForm] = useState<FormData>(
    cat
      ? { slug: cat.slug, name: cat.name, description: cat.description ?? '', icon: cat.icon ?? '', image: cat.image ?? '', tag: cat.tag ?? '', position: cat.position, isActive: cat.isActive }
      : EMPTY
  )
  const [imgPreview, setImgPreview] = useState(cat?.image ?? '')
  const [autoSlug, setAutoSlug] = useState(!cat)

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleNameChange = (v: string) => {
    set('name', v)
    if (autoSlug) set('slug', slugify(v))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-indigo-500" />
            <h2 className="text-base font-semibold text-slate-900">
              {cat ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Nom + icône */}
          <div className="flex gap-3">
            <div className="w-20">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Icône</label>
              <input
                value={form.icon}
                onChange={e => set('icon', e.target.value)}
                placeholder="📱"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xl text-center focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Nom <span className="text-red-400">*</span>
              </label>
              <input
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="High-Tech"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Slug */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 flex items-center justify-between">
              <span>Slug <span className="text-red-400">*</span></span>
              <button
                type="button"
                onClick={() => { setAutoSlug(v => !v); if (!autoSlug) set('slug', slugify(form.name)) }}
                className="text-[10px] text-indigo-500 hover:underline"
              >
                {autoSlug ? '✎ Modifier manuellement' : '↻ Auto depuis le nom'}
              </button>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 shrink-0">?cat=</span>
              <input
                value={form.slug}
                onChange={e => { setAutoSlug(false); set('slug', e.target.value) }}
                placeholder="hightech"
                className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Gadgets, audio & accessoires..."
              rows={2}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none"
            />
          </div>

          {/* Image */}
          <ImagePicker
            currentUrl={form.image}
            preview={imgPreview || form.image}
            onUrlChange={url => { set('image', url); setImgPreview(url) }}
            onFileChange={(file, local) => {
              set('imageFile', file)
              setImgPreview(local)
            }}
          />

          {/* Tag */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Badge (facultatif)</label>
            <input
              value={form.tag}
              onChange={e => set('tag', e.target.value)}
              placeholder="Tendance, Populaire..."
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Position + Actif */}
          <div className="flex gap-3 items-center">
            <div className="w-28">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Position</label>
              <input
                type="number" min={0}
                value={form.position}
                onChange={e => set('position', parseInt(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex-1 flex items-center gap-2 pt-5">
              <button
                type="button"
                onClick={() => set('isActive', !form.isActive)}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${form.isActive ? 'text-emerald-600' : 'text-slate-400'}`}
              >
                {form.isActive
                  ? <ToggleRight size={22} className="text-emerald-500" />
                  : <ToggleLeft size={22} />
                }
                {form.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button size="sm" loading={saving} onClick={() => onSave(form)}>
            <Check size={14} /> {cat ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Delete confirm ───────────────────────────────────────────── */
function DeleteConfirm({ cat, onClose, onConfirm, loading }: { cat: Category; onClose: () => void; onConfirm: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={22} className="text-red-500" />
        </div>
        <h3 className="font-semibold text-slate-900 mb-1">Supprimer la catégorie ?</h3>
        <p className="text-sm text-slate-500 mb-6">
          <strong>"{cat.name}"</strong> sera supprimée définitivement. Les produits associés ne seront pas affectés.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={loading}>Annuler</Button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? '...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────────────── */
export default function CategoriesPage() {
  const qc = useQueryClient()
  const [editCat, setEditCat]     = useState<Category | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteCat, setDeleteCat] = useState<Category | null>(null)
  const [savingImg, setSavingImg] = useState(false)

  const { data, isLoading } = useQuery<Category[]>({
    queryKey: ['categories-admin'],
    queryFn: async () => {
      const { data } = await api.get('/api/categories/admin')
      return data.data as Category[]
    },
  })
  const categories = data ?? []

  /* ── Mutations ────────────────────────────────────────────────── */
  const createMut = useMutation({
    mutationFn: (body: object) => api.post('/api/categories', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories-admin'] }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => api.put(`/api/categories/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories-admin'] }),
  })

  const toggleMut = useMutation({
    mutationFn: (id: number) => api.patch(`/api/categories/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories-admin'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories-admin'] }); setDeleteCat(null) },
  })

  const reorderMut = useMutation({
    mutationFn: (order: number[]) => api.patch('/api/categories/reorder', { order }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories-admin'] }),
  })

  /* ── Upload image helper ─────────────────────────────────────── */
  async function uploadImage(id: number, file: File) {
    const fd = new FormData()
    fd.append('image', file)
    await api.post(`/api/categories/${id}/image`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    qc.invalidateQueries({ queryKey: ['categories-admin'] })
  }

  /* ── Save handler ─────────────────────────────────────────────── */
  async function handleSave(form: FormData) {
    const { imageFile, ...rest } = form
    const body = {
      ...rest,
      image: imageFile ? rest.image : (rest.image || undefined),  // ne pas envoyer une string vide
    }

    setSavingImg(true)
    try {
      if (editCat) {
        await updateMut.mutateAsync({ id: editCat.id, body })
        if (imageFile) await uploadImage(editCat.id, imageFile)
      } else {
        const res = await createMut.mutateAsync(body)
        const newId = (res.data as { data: { id: number } }).data.id
        if (imageFile && newId) await uploadImage(newId, imageFile)
      }
      setModalOpen(false)
    } finally {
      setSavingImg(false)
    }
  }

  /* ── Reorder ─────────────────────────────────────────────────── */
  function moveItem(from: number, to: number) {
    const arr = [...categories]
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    reorderMut.mutate(arr.map(c => c.id))
  }

  const isSaving = savingImg || createMut.isPending || updateMut.isPending
  const error = (createMut.error || updateMut.error || deleteMut.error) as Error | null

  return (
    <div className="space-y-5">
      <PageTitle
        title="Catégories"
        sub={`${categories.length} catégorie${categories.length !== 1 ? 's' : ''}`}
        action={
          <Button size="sm" onClick={() => { setEditCat(null); setModalOpen(true) }}>
            <Plus size={14} /> Nouvelle catégorie
          </Button>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
          {error.message}
        </div>
      )}

      <Card>
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center">
            <Tag size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">Aucune catégorie</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {categories.map((cat, i) => (
              <div key={cat.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group">
                {/* Up/down */}
                <div className="flex flex-col gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button disabled={i === 0} onClick={() => moveItem(i, i - 1)}
                    className="w-5 h-4 flex items-center justify-center text-slate-300 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed text-[10px]">▲</button>
                  <button disabled={i === categories.length - 1} onClick={() => moveItem(i, i + 1)}
                    className="w-5 h-4 flex items-center justify-center text-slate-300 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed text-[10px]">▼</button>
                </div>
                <GripVertical size={14} className="text-slate-200 group-hover:text-slate-300 transition-colors shrink-0" />

                {/* Image */}
                <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-100">
                  {cat.image
                    ? <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                    : <span className="text-2xl">{cat.icon ?? '📦'}</span>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg leading-none">{cat.icon}</span>
                    <span className="text-sm font-semibold text-slate-900">{cat.name}</span>
                    {cat.tag && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600">
                        {cat.tag}
                      </span>
                    )}
                    <Badge label={cat.isActive ? 'active' : 'inactive'} />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs font-mono text-slate-400">/{cat.slug}</span>
                    {cat.description && (
                      <span className="text-xs text-slate-400 truncate max-w-xs hidden sm:block">{cat.description}</span>
                    )}
                  </div>
                </div>

                {/* Position */}
                <div className="text-xs font-mono text-slate-300 w-8 text-center hidden md:block">#{cat.position}</div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleMut.mutate(cat.id)}
                    className={`p-1.5 rounded-lg transition-all ${cat.isActive ? 'hover:bg-amber-50 text-slate-400 hover:text-amber-500' : 'hover:bg-emerald-50 text-slate-300 hover:text-emerald-500'}`}
                    title={cat.isActive ? 'Désactiver' : 'Activer'}
                  >
                    {cat.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  </button>
                  <button
                    onClick={() => { setEditCat(cat); setModalOpen(true) }}
                    className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all"
                    title="Modifier"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteCat(cat)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modals */}
      {modalOpen && (
        <CategoryModal
          cat={editCat}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          saving={isSaving}
        />
      )}
      {deleteCat && (
        <DeleteConfirm
          cat={deleteCat}
          onClose={() => setDeleteCat(null)}
          onConfirm={() => deleteMut.mutate(deleteCat.id)}
          loading={deleteMut.isPending}
        />
      )}
      {reorderMut.isPending && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 pointer-events-none">
          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
          Réordonnancement...
        </div>
      )}
    </div>
  )
}
