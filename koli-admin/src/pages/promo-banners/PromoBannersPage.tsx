import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Megaphone,
  ToggleLeft, ToggleRight, X, Check, AlertTriangle, Upload, ImageIcon,
} from 'lucide-react'
import { api } from '../../lib/api'
import { PageTitle } from '../../components/layout/Sidebar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import type { PromoBanner } from '../../types'

/* Emplacements connus aujourd'hui — champ libre côté formulaire (validé par
   le même motif slug côté backend), pour ne pas bloquer un futur emplacement. */
const KNOWN_SLOTS = ['home-bestsellers-left', 'home-bestsellers-right']

/* ── Types ─────────────────────────────────────────────────────── */
type FormData = {
  slot: string; title: string; href: string; ctaLabel: string
  image: string; position: number; isActive: boolean
  imageFile?: File
}

const EMPTY: FormData = {
  slot: '', title: '', href: '', ctaLabel: 'En savoir plus', image: '', position: 0, isActive: true,
}

/* ── Image Picker (identique à CategoriesPage) ────────────────── */
function ImagePicker({
  currentUrl, onUrlChange, onFileChange, preview,
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
        <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
          {preview
            ? <img src={preview} alt="" className="w-full h-full object-cover" />
            : <ImageIcon size={24} className="text-slate-300" />
          }
        </div>
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

/* ── Modal ─────────────────────────────────────────────────────── */
function BannerModal({
  banner, onClose, onSave, saving,
}: {
  banner: PromoBanner | null
  onClose: () => void
  onSave: (data: FormData) => void
  saving: boolean
}) {
  const [form, setForm] = useState<FormData>(
    banner
      ? { slot: banner.slot, title: banner.title, href: banner.href, ctaLabel: banner.ctaLabel, image: banner.image, position: banner.position, isActive: banner.isActive }
      : EMPTY
  )
  const [imgPreview, setImgPreview] = useState(banner?.image ?? '')

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Megaphone size={16} className="text-indigo-500" />
            <h2 className="text-base font-semibold text-slate-900">
              {banner ? 'Modifier la bannière' : 'Nouvelle bannière'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Emplacement */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">
              Emplacement <span className="text-red-400">*</span>
            </label>
            <input
              value={form.slot}
              onChange={e => set('slot', e.target.value)}
              placeholder="home-bestsellers-left"
              list="known-slots"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none"
            />
            <datalist id="known-slots">
              {KNOWN_SLOTS.map(s => <option key={s} value={s} />)}
            </datalist>
            <p className="text-[11px] text-slate-400 mt-1">
              Identifie où la bannière s'affiche sur le site — ex. les deux rectangles
              qui encadrent "Meilleures ventes" sur l'accueil sont{' '}
              <code className="text-slate-500">home-bestsellers-left</code> et{' '}
              <code className="text-slate-500">home-bestsellers-right</code>.
            </p>
          </div>

          {/* Titre */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">
              Titre <span className="text-red-400">*</span>
            </label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Ventes Flash — jusqu'à -50%"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Lien + CTA */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Lien <span className="text-red-400">*</span>
              </label>
              <input
                value={form.href}
                onChange={e => set('href', e.target.value)}
                placeholder="/catalogue?badges=sale"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="w-40">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Texte du bouton</label>
              <input
                value={form.ctaLabel}
                onChange={e => set('ctaLabel', e.target.value)}
                placeholder="Voir les offres"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
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

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button
            size="sm"
            loading={saving}
            disabled={!form.slot.trim() || !form.title.trim() || !form.href.trim()}
            onClick={() => onSave(form)}
          >
            <Check size={14} /> {banner ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Delete confirm ───────────────────────────────────────────── */
function DeleteConfirm({ banner, onClose, onConfirm, loading }: { banner: PromoBanner; onClose: () => void; onConfirm: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={22} className="text-red-500" />
        </div>
        <h3 className="font-semibold text-slate-900 mb-1">Supprimer la bannière ?</h3>
        <p className="text-sm text-slate-500 mb-6">
          <strong>"{banner.title}"</strong> sera supprimée définitivement du site.
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
export default function PromoBannersPage() {
  const qc = useQueryClient()
  const [editBanner, setEditBanner] = useState<PromoBanner | null>(null)
  const [modalOpen, setModalOpen]   = useState(false)
  const [deleteBanner, setDeleteBanner] = useState<PromoBanner | null>(null)
  const [savingImg, setSavingImg]   = useState(false)

  const { data, isLoading } = useQuery<PromoBanner[]>({
    queryKey: ['promo-banners-admin'],
    queryFn: async () => {
      const { data } = await api.get('/api/promo-banners/admin')
      return data.data as PromoBanner[]
    },
  })
  const banners = data ?? []

  /* ── Mutations ────────────────────────────────────────────────── */
  const createMut = useMutation({
    mutationFn: (body: object) => api.post('/api/promo-banners', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promo-banners-admin'] }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => api.put(`/api/promo-banners/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promo-banners-admin'] }),
  })

  const toggleMut = useMutation({
    mutationFn: (id: number) => api.patch(`/api/promo-banners/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promo-banners-admin'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/api/promo-banners/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promo-banners-admin'] }); setDeleteBanner(null) },
  })

  /* ── Upload image helper ─────────────────────────────────────── */
  async function uploadImage(id: number, file: File) {
    const fd = new FormData()
    fd.append('image', file)
    await api.post(`/api/promo-banners/${id}/image`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    qc.invalidateQueries({ queryKey: ['promo-banners-admin'] })
  }

  /* ── Save handler ─────────────────────────────────────────────── */
  async function handleSave(form: FormData) {
    const { imageFile, ...rest } = form
    const body = {
      ...rest,
      image: imageFile ? rest.image : (rest.image || undefined),
    }

    setSavingImg(true)
    try {
      if (editBanner) {
        await updateMut.mutateAsync({ id: editBanner.id, body })
        if (imageFile) await uploadImage(editBanner.id, imageFile)
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

  const isSaving = savingImg || createMut.isPending || updateMut.isPending
  const error = (createMut.error || updateMut.error || deleteMut.error) as Error | null

  return (
    <div className="space-y-5">
      <PageTitle
        title="Bannières publicitaires"
        sub={`${banners.length} bannière${banners.length !== 1 ? 's' : ''} — rectangles promo affichés sur le site (ex: encadrant "Meilleures ventes")`}
        action={
          <Button size="sm" onClick={() => { setEditBanner(null); setModalOpen(true) }}>
            <Plus size={14} /> Nouvelle bannière
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
        ) : banners.length === 0 ? (
          <div className="p-12 text-center">
            <Megaphone size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">Aucune bannière pour le moment</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {banners.map(banner => (
              <div key={banner.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group">
                {/* Image */}
                <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-100">
                  {banner.image
                    ? <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                    : <ImageIcon size={20} className="text-slate-300" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{banner.title}</span>
                    <Badge label={banner.isActive ? 'active' : 'inactive'} />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">{banner.slot}</span>
                    <span className="text-xs font-mono text-slate-400 truncate max-w-xs">{banner.href}</span>
                  </div>
                </div>

                {/* Position */}
                <div className="text-xs font-mono text-slate-300 w-8 text-center hidden md:block">#{banner.position}</div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleMut.mutate(banner.id)}
                    className={`p-1.5 rounded-lg transition-all ${banner.isActive ? 'hover:bg-amber-50 text-slate-400 hover:text-amber-500' : 'hover:bg-emerald-50 text-slate-300 hover:text-emerald-500'}`}
                    title={banner.isActive ? 'Désactiver' : 'Activer'}
                  >
                    {banner.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  </button>
                  <button
                    onClick={() => { setEditBanner(banner); setModalOpen(true) }}
                    className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all"
                    title="Modifier"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteBanner(banner)}
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

      {modalOpen && (
        <BannerModal
          banner={editBanner}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          saving={isSaving}
        />
      )}
      {deleteBanner && (
        <DeleteConfirm
          banner={deleteBanner}
          onClose={() => setDeleteBanner(null)}
          onConfirm={() => deleteMut.mutate(deleteBanner.id)}
          loading={deleteMut.isPending}
        />
      )}
    </div>
  )
}
