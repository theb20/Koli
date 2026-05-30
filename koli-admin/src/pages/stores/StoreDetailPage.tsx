import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Package, Download, Link2, Code2, AlertTriangle,
  CheckCircle2, Loader2, ExternalLink, Trash2, Eye, EyeOff,
  RefreshCw, Edit3, X, ChevronLeft, ChevronRight,
  Plus, Check, ImageOff, Tag, BarChart2, Star,
} from 'lucide-react'
import { api, fmt, fmtDate } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { Confirm } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'

/* ══════════════════════════════════════════════════════════════
   Types
══════════════════════════════════════════════════════════════ */
type StoreData = {
  id: number; name: string; description?: string; address?: string
  phone?: string; email?: string; website?: string
  isActive: boolean; lastImportAt?: string; createdAt: string
  _count: { products: number }
}

type ScrapeItem = {
  name: string
  brand: string
  description: string
  price: number
  oldPrice?: number
  stock: number
  category: string
  badge: string
  images: string[]
  activeImg: number
  specs: { label: string; value: string }[]
  selected: boolean
  imported: boolean
  source: string
}

const CATS = [
  { value: 'hightech', label: 'High-tech' },
  { value: 'maison',   label: 'Maison' },
  { value: 'beaute',   label: 'Beauté' },
  { value: 'sport',    label: 'Sport' },
  { value: 'mode',     label: 'Mode' },
  { value: 'jeux',     label: 'Jeux' },
]

const BADGES = [
  { value: '', label: 'Aucun' }, { value: 'hot', label: 'Hot 🔥' },
  { value: 'new', label: 'Nouveau ✨' }, { value: 'sale', label: 'Promo 💰' },
  { value: 'top', label: 'Top ⭐' },
]

type Tab = 'products' | 'url' | 'json'

/* ══════════════════════════════════════════════════════════════
   ScrapedProductCard
══════════════════════════════════════════════════════════════ */
function ScrapedProductCard({
  item, index, onUpdate, onImportSingle, importing,
}: {
  item: ScrapeItem
  index: number
  onUpdate: (i: number, patch: Partial<ScrapeItem>) => void
  onImportSingle: (i: number) => void
  importing: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [newImg, setNewImg]   = useState('')
  const [newSpec, setNewSpec] = useState({ label: '', value: '' })

  const upd = (patch: Partial<ScrapeItem>) => onUpdate(index, patch)

  /* Image helpers */
  const prevImg = () => upd({ activeImg: item.activeImg > 0 ? item.activeImg - 1 : item.images.length - 1 })
  const nextImg = () => upd({ activeImg: item.activeImg < item.images.length - 1 ? item.activeImg + 1 : 0 })
  const removeImg = (i: number) => {
    const imgs = item.images.filter((_, j) => j !== i)
    upd({ images: imgs, activeImg: Math.min(item.activeImg, imgs.length - 1) })
  }
  const addImg = () => {
    if (!newImg.trim()) return
    upd({ images: [...item.images, newImg.trim()] }); setNewImg('')
  }

  /* Spec helpers */
  const addSpec = () => {
    if (!newSpec.label) return
    upd({ specs: [...item.specs, newSpec] }); setNewSpec({ label: '', value: '' })
  }
  const removeSpec = (i: number) => upd({ specs: item.specs.filter((_, j) => j !== i) })

  const currentImg = item.images[item.activeImg]

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${
      item.imported ? 'border-green-300 bg-green-50/30' :
      item.selected ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200 opacity-70'
    }`}>
      {/* Image header */}
      <div className="relative h-44 bg-slate-100 group">
        {currentImg ? (
          <img src={currentImg} alt="" className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff size={28} className="text-slate-300" />
          </div>
        )}

        {/* Image navigation */}
        {item.images.length > 1 && (
          <>
            <button onClick={prevImg}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronLeft size={14} />
            </button>
            <button onClick={nextImg}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight size={14} />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {item.images.map((_, j) => (
                <button key={j} onClick={() => upd({ activeImg: j })}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${j === item.activeImg ? 'bg-white scale-125' : 'bg-white/50'}`} />
              ))}
            </div>
          </>
        )}

        {/* Source badge */}
        <span className="absolute top-2 left-2 text-[10px] bg-black/40 text-white px-1.5 py-0.5 rounded-md font-mono">
          {item.source}
        </span>

        {/* Select checkbox */}
        <label className="absolute top-2 right-2 cursor-pointer">
          <input type="checkbox" checked={item.selected} onChange={e => upd({ selected: e.target.checked })} className="sr-only" />
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            item.selected ? 'bg-indigo-600 border-indigo-600' : 'bg-white/80 border-white'
          }`}>
            {item.selected && <Check size={11} className="text-white" />}
          </div>
        </label>

        {/* Imported badge */}
        {item.imported && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
            <div className="bg-green-500 text-white rounded-full p-2 shadow-lg">
              <Check size={20} />
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Name */}
        <input
          value={item.name}
          onChange={e => upd({ name: e.target.value })}
          className="w-full text-sm font-semibold text-slate-900 bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-indigo-400 focus:outline-none py-0.5 transition-colors"
          placeholder="Nom du produit"
        />

        {/* Brand + Category row */}
        <div className="flex gap-2">
          <input value={item.brand} onChange={e => upd({ brand: e.target.value })}
            placeholder="Marque"
            className="flex-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:border-indigo-400 focus:outline-none focus:bg-white transition-colors" />
          <select value={item.category} onChange={e => upd({ category: e.target.value })}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:border-indigo-400 focus:outline-none">
            {CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Price row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input type="number" value={item.price || ''} onChange={e => upd({ price: parseFloat(e.target.value) || 0 })}
              placeholder="Prix"
              className="w-full text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-12 py-1.5 focus:border-indigo-400 focus:outline-none focus:bg-white transition-colors" />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">FCFA</span>
          </div>
          <div className="relative">
            <input type="number" value={item.oldPrice || ''} onChange={e => upd({ oldPrice: parseFloat(e.target.value) || undefined })}
              placeholder="Ancien prix"
              className="w-24 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg pl-2 pr-7 py-1.5 focus:border-indigo-400 focus:outline-none transition-colors line-through placeholder:no-underline" />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-300 pointer-events-none">F</span>
          </div>
        </div>

        {/* Description — collapsible */}
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors select-none">
            {item.description ? '▸ Description' : '▸ Ajouter une description'}
          </summary>
          <textarea value={item.description} onChange={e => upd({ description: e.target.value })}
            rows={3} placeholder="Description du produit..."
            className="mt-1.5 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:border-indigo-400 focus:outline-none resize-none" />
        </details>

        {/* Full editor toggle */}
        {editing && (
          <div className="border border-slate-200 rounded-xl p-3 space-y-3 bg-slate-50">
            {/* Badge + Stock */}
            <div className="flex gap-2">
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Badge</p>
                <select value={item.badge} onChange={e => upd({ badge: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:border-indigo-400 focus:outline-none">
                  {BADGES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Stock</p>
                <input type="number" value={item.stock} onChange={e => upd({ stock: parseInt(e.target.value) || 0 })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:border-indigo-400 focus:outline-none" />
              </div>
            </div>

            {/* Images */}
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Images</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {item.images.map((url, j) => (
                  <div key={j} className="relative group/img">
                    <div className={`w-10 h-10 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${j === item.activeImg ? 'border-indigo-400' : 'border-slate-200'}`}
                      onClick={() => upd({ activeImg: j })}>
                      <img src={url} alt="" className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                    </div>
                    <button onClick={() => removeImg(j)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                      <X size={9} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                <input value={newImg} onChange={e => setNewImg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addImg()}
                  placeholder="URL image..."
                  className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:border-indigo-400 focus:outline-none" />
                <button onClick={addImg}
                  className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  <Plus size={12} />
                </button>
              </div>
            </div>

            {/* Specs */}
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Spécifications</p>
              {item.specs.map((s, j) => (
                <div key={j} className="flex gap-1 mb-1 items-center">
                  <span className="text-xs text-slate-600 flex-1 truncate">{s.label}: {s.value}</span>
                  <button onClick={() => removeSpec(j)} className="text-red-400 hover:text-red-600 shrink-0">
                    <X size={11} />
                  </button>
                </div>
              ))}
              <div className="flex gap-1 mt-1">
                <input value={newSpec.label} onChange={e => setNewSpec(s => ({ ...s, label: e.target.value }))}
                  placeholder="Clé" className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:border-indigo-400 focus:outline-none" />
                <input value={newSpec.value} onChange={e => setNewSpec(s => ({ ...s, value: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addSpec()}
                  placeholder="Valeur" className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:border-indigo-400 focus:outline-none" />
                <button onClick={addSpec} className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors">
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center gap-2 pt-1">
          <button onClick={() => setEditing(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${editing ? 'bg-slate-100 border-slate-300 text-slate-700' : 'border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}`}>
            <Edit3 size={11} />
            {editing ? 'Replier' : 'Éditer complet'}
          </button>

          <div className="flex-1" />

          {item.imported ? (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle2 size={13} /> Importé
            </span>
          ) : (
            <button
              onClick={() => onImportSingle(index)}
              disabled={importing}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
            >
              {importing ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
              Importer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Main page
══════════════════════════════════════════════════════════════ */
export default function StoreDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const storeId  = parseInt(id ?? '0')

  const [tab, setTab]   = useState<Tab>('products')
  const [page, setPage] = useState(1)
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null)

  // URL scrape
  const [scrapeUrl, setScrapeUrl]   = useState('')
  const [scraped, setScraped]       = useState<ScrapeItem[]>([])
  const [scrapeError, setScrapeError] = useState('')
  const [isScraping, setIsScraping] = useState(false)
  const [singleImporting, setSingleImporting] = useState<number | null>(null)

  // JSON import
  const [jsonInput, setJsonInput]     = useState('')
  const [jsonError, setJsonError]     = useState('')
  const [jsonPreview, setJsonPreview] = useState<ScrapeItem[]>([])
  const jsonTextareaRef = useRef<HTMLTextAreaElement>(null)

  /* ── Queries ─────────────────────────────────────────────── */
  const { data: store } = useQuery<StoreData>({
    queryKey: ['store', storeId],
    queryFn: async () => { const { data } = await api.get(`/api/stores/${storeId}`); return data.data.store },
  })

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['store-products', storeId, page],
    queryFn: async () => { const { data } = await api.get(`/api/stores/${storeId}/products?page=${page}&limit=15`); return data.data },
    enabled: tab === 'products',
    placeholderData: (prev) => prev,
  })

  /* ── Import mutation ─────────────────────────────────────── */
  const importMutation = useMutation({
    mutationFn: (products: object[]) => api.post(`/api/stores/${storeId}/import`, { products }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['store-products', storeId] })
      qc.invalidateQueries({ queryKey: ['store', storeId] })
      qc.invalidateQueries({ queryKey: ['products'] })
      return res
    },
  })

  const toggleActive = useMutation({
    mutationFn: ({ pid, isActive }: { pid: number; isActive: boolean }) =>
      api.put(`/api/products/${pid}`, { isActive: !isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store-products', storeId] }),
  })

  const deleteProd = useMutation({
    mutationFn: (pid: number) => api.delete(`/api/products/${pid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['store-products', storeId] }); setDeleteProductId(null) },
  })

  /* ── Helpers ─────────────────────────────────────────────── */
  const toScrapeItem = (raw: Record<string, unknown>, source: string): ScrapeItem => ({
    name:        String(raw.name ?? ''),
    brand:       String(raw.brand ?? ''),
    description: String(raw.description ?? ''),
    price:       Number(raw.price ?? 0),
    oldPrice:    raw.oldPrice ? Number(raw.oldPrice) : undefined,
    stock:       Number(raw.stock ?? 100),
    category:    String(raw.category ?? 'maison'),
    badge:       String(raw.badge ?? ''),
    images:      (Array.isArray(raw.images) ? raw.images : []).filter((u: unknown) => typeof u === 'string' && u.startsWith('http')),
    activeImg:   0,
    specs:       Array.isArray(raw.specs) ? raw.specs : [],
    selected:    true,
    imported:    false,
    source,
  })

  const buildPayload = (item: ScrapeItem) => ({
    name:        item.name || 'Produit sans nom',
    brand:       item.brand || 'Sans marque',
    category:    item.category || 'maison',
    price:       Number(item.price) || 0,
    oldPrice:    item.oldPrice || undefined,
    description: item.description || undefined,
    stock:       item.stock ?? 100,
    badge:       item.badge || undefined,
    specs:       item.specs.length ? item.specs : undefined,
    images:      item.images.slice(0, 4),
  })

  /* ── Scrape URL ──────────────────────────────────────────── */
  const handleScrape = async () => {
    if (!scrapeUrl) return
    setIsScraping(true); setScrapeError(''); setScraped([])
    try {
      const { data } = await api.post(`/api/stores/${storeId}/scrape`, { url: scrapeUrl })
      if (data.data.count === 0) {
        setScrapeError("Aucun produit détecté. Le site n'expose peut-être pas de données structurées. Utilisez l'Import JSON.")
      } else {
        setScraped(data.data.products.map((p: Record<string, unknown>) => toScrapeItem(p, String(p.source ?? 'scrape'))))
      }
    } catch (err: unknown) {
      setScrapeError((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Erreur de scraping')
    } finally { setIsScraping(false) }
  }

  /* ── Import single product ───────────────────────────────── */
  const handleImportSingle = async (i: number) => {
    const list = scraped.length ? scraped : jsonPreview
    const item = list[i]
    if (!item) return
    setSingleImporting(i)
    try {
      await importMutation.mutateAsync([buildPayload(item)])
      const setter = scraped.length ? setScraped : setJsonPreview
      setter(s => s.map((x, j) => j === i ? { ...x, imported: true } : x))
    } finally { setSingleImporting(null) }
  }

  /* ── Import all selected ─────────────────────────────────── */
  const handleImportSelected = async (list: ScrapeItem[], setter: (fn: (s: ScrapeItem[]) => ScrapeItem[]) => void) => {
    const toImport = list.filter(p => p.selected && !p.imported)
    if (!toImport.length) return
    try {
      await importMutation.mutateAsync(toImport.map(buildPayload))
      setter(s => s.map(p => p.selected && !p.imported ? { ...p, imported: true } : p))
    } catch { /* handled by isError */ }
  }

  /* ── JSON parse ──────────────────────────────────────────── */
  const handleParseJson = () => {
    setJsonError('')
    try {
      const parsed = JSON.parse(jsonInput)
      const items = Array.isArray(parsed) ? parsed : [parsed]
      setJsonPreview(items.map((p: Record<string, unknown>) => toScrapeItem(p, 'json')))
    } catch { setJsonError('JSON invalide — vérifiez la syntaxe') }
  }

  /* ── Selected counts ─────────────────────────────────────── */
  const scrapedSelected  = scraped.filter(p => p.selected && !p.imported).length
  const scrapedImported  = scraped.filter(p => p.imported).length
  const jsonSelected     = jsonPreview.filter(p => p.selected && !p.imported).length

  const products   = productsData?.products ?? []
  const pagination = productsData?.pagination

  const tabCls = (t: Tab) =>
    `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${tab === t
      ? 'bg-indigo-600 text-white shadow-sm'
      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`

  return (
    <div className="space-y-5 max-w-7xl">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/stores')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{store?.name ?? '…'}</h1>
            {store && <Badge label={store.isActive ? 'active' : 'inactive'} />}
          </div>
          {store?.description && <p className="text-sm text-slate-500 mt-0.5">{store.description}</p>}
        </div>
        {store?.website && (
          <a href={store.website} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            <ExternalLink size={13} /> Visiter le site
          </a>
        )}
      </div>

      {/* ── Stats row ──────────────────────────────────────── */}
      {store && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Produits', value: store._count.products, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Statut', value: store.isActive ? 'Actif' : 'Inactif', icon: BarChart2, color: store.isActive ? 'text-green-600' : 'text-slate-500', bg: store.isActive ? 'bg-green-50' : 'bg-slate-100' },
            { label: 'Créé le', value: fmtDate(store.createdAt), icon: Star, color: 'text-slate-700', bg: 'bg-slate-100' },
            { label: 'Dernier import', value: store.lastImportAt ? fmtDate(store.lastImportAt) : '—', icon: Download, color: 'text-slate-700', bg: 'bg-slate-100' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${bg}`}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                <p className={`text-sm font-bold mt-0.5 ${color}`}>{value}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="flex gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit overflow-x-auto">
        <button className={tabCls('products')} onClick={() => setTab('products')}>
          <Package size={14} /> Produits {store && `(${store._count.products})`}
        </button>
        <button className={tabCls('url')} onClick={() => setTab('url')}>
          <Link2 size={14} /> Scraper une URL
        </button>
        <button className={tabCls('json')} onClick={() => setTab('json')}>
          <Code2 size={14} /> Import JSON
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════
          Tab: Products list
      ══════════════════════════════════════════════════════ */}
      {tab === 'products' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Produits de ce magasin</h3>
            <Button size="sm" variant="secondary" icon={<Link2 size={13} />} onClick={() => setTab('url')}>
              Importer des produits
            </Button>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                {['Produit', 'Catégorie', 'Prix', 'Stock', 'Statut', 'Créé le', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingProducts
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-8 bg-slate-100 rounded-lg animate-pulse" /></td></tr>
                  ))
                : products.length === 0
                ? (
                  <tr><td colSpan={7} className="py-14 text-center">
                    <Package size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-400 text-sm">Aucun produit importé</p>
                    <button onClick={() => setTab('url')} className="mt-2 text-indigo-600 text-sm hover:underline font-medium">
                      Importer via URL →
                    </button>
                  </td></tr>
                )
                : products.map((p: { id: number; name: string; brand: string; category: string; price: number; stock: number; isActive: boolean; createdAt: string; images: { url: string }[] }) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                          {p.images?.[0] && <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 capitalize">{p.category}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{fmt(p.price)} FCFA</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{p.stock}</td>
                    <td className="px-4 py-3"><Badge label={p.isActive ? 'active' : 'inactive'} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => toggleActive.mutate({ pid: p.id, isActive: p.isActive })}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all">
                          {p.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button onClick={() => setDeleteProductId(p.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
          {pagination && (
            <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={15} onChange={setPage} />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          Tab: URL Scrape
      ══════════════════════════════════════════════════════ */}
      {tab === 'url' && (
        <div className="space-y-5">
          {/* Search bar */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Scraper une page web</h3>
            <p className="text-xs text-slate-500 mb-4">
              Entrez l'URL d'une fiche produit ou d'un catalogue. Les données structurées (JSON-LD, OpenGraph, Microdata) seront extraites automatiquement.
            </p>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  value={scrapeUrl}
                  onChange={e => setScrapeUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleScrape()}
                  placeholder="https://exemple.com/produit-123"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
              <Button onClick={handleScrape} disabled={!scrapeUrl || isScraping}
                icon={isScraping ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}>
                {isScraping ? 'Analyse en cours…' : 'Analyser l\'URL'}
              </Button>
            </div>

            {scrapeError && (
              <div className="mt-3 flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Aucun produit détecté</p>
                  <p className="text-xs mt-0.5 text-amber-600">{scrapeError}</p>
                </div>
              </div>
            )}

            <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-indigo-700 mb-1.5">💡 Conseils pour de meilleurs résultats</p>
              <div className="grid grid-cols-2 gap-x-6 text-xs text-indigo-600 space-y-0.5">
                <p>• URL de fiche produit individuelle</p>
                <p>• Sites Shopify, WooCommerce détectés auto</p>
                <p>• Amazon, Jumia, AliExpress supportés</p>
                <p>• Vous pouvez tout modifier avant d'importer</p>
              </div>
            </div>
          </Card>

          {/* Results */}
          {scraped.length > 0 && (
            <>
              {/* Top bar */}
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-900">
                    {scraped.length} produit{scraped.length > 1 ? 's' : ''} détecté{scraped.length > 1 ? 's' : ''}
                  </span>
                  {scrapedImported > 0 && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={11} /> {scrapedImported} importé{scrapedImported > 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{scrapedSelected} sélectionné{scrapedSelected > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setScraped(s => s.map(p => ({ ...p, selected: true })))}
                    className="text-xs text-indigo-600 hover:underline font-medium">Tout sélectionner</button>
                  <span className="text-slate-300 text-xs">|</span>
                  <button onClick={() => setScraped(s => s.map(p => ({ ...p, selected: false })))}
                    className="text-xs text-slate-500 hover:text-slate-700">Tout désélectionner</button>
                  <span className="text-slate-300 text-xs">|</span>
                  <button onClick={() => { setScraped([]); setScrapeUrl('') }}
                    className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
                    <X size={11} /> Effacer
                  </button>
                  <Button
                    onClick={() => handleImportSelected(scraped, setScraped)}
                    loading={importMutation.isPending && singleImporting === null}
                    disabled={scrapedSelected === 0}
                    icon={<Download size={13} />}
                    size="sm"
                  >
                    Importer {scrapedSelected > 0 ? `(${scrapedSelected})` : 'la sélection'}
                  </Button>
                </div>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {scraped.map((item, i) => (
                  <ScrapedProductCard
                    key={i}
                    item={item}
                    index={i}
                    onUpdate={(idx, patch) => setScraped(s => s.map((x, j) => j === idx ? { ...x, ...patch } : x))}
                    onImportSingle={handleImportSingle}
                    importing={singleImporting === i}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          Tab: JSON import
      ══════════════════════════════════════════════════════ */}
      {tab === 'json' && (
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Import JSON manuel</h3>
            <p className="text-xs text-slate-500 mb-4">
              Collez un tableau JSON de produits. Après avoir cliqué sur "Prévisualiser", les cartes apparaissent et vous pouvez tout modifier avant d'importer.
            </p>

            <details className="mb-3 group">
              <summary className="text-xs font-medium text-indigo-600 cursor-pointer hover:text-indigo-700 select-none flex items-center gap-1">
                <Tag size={11} /> Voir le format JSON attendu
              </summary>
              <pre className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 overflow-x-auto leading-relaxed">{`[
  {
    "name": "Nom du produit",
    "brand": "Marque",
    "category": "hightech",
    "price": 29990,
    "oldPrice": 39990,
    "description": "Description du produit...",
    "stock": 50,
    "badge": "hot",
    "images": [
      "https://url-image1.jpg",
      "https://url-image2.jpg"
    ],
    "specs": [
      { "label": "Couleur", "value": "Noir" },
      { "label": "Matière", "value": "Coton" }
    ]
  }
]`}</pre>
            </details>

            <textarea
              ref={jsonTextareaRef}
              value={jsonInput}
              onChange={e => { setJsonInput(e.target.value); setJsonError(''); setJsonPreview([]) }}
              rows={10}
              spellCheck={false}
              placeholder={'[\n  { "name": "Mon produit", "price": 15000, "category": "mode" }\n]'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none resize-none font-mono leading-relaxed"
            />

            {jsonError && (
              <div className="mt-2 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-xl">
                <AlertTriangle size={13} /> {jsonError}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-3">
              {jsonInput && (
                <button onClick={() => { setJsonInput(''); setJsonPreview([]); setJsonError('') }}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                  <X size={11} /> Effacer
                </button>
              )}
              <Button onClick={handleParseJson} disabled={!jsonInput} variant="secondary">
                Prévisualiser les produits
              </Button>
            </div>
          </Card>

          {jsonPreview.length > 0 && (
            <>
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-900">
                    {jsonPreview.length} produit{jsonPreview.length > 1 ? 's' : ''} dans le JSON
                  </span>
                  <span className="text-xs text-slate-400">{jsonSelected} sélectionné{jsonSelected > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setJsonPreview(s => s.map(p => ({ ...p, selected: true })))}
                    className="text-xs text-indigo-600 hover:underline font-medium">Tout sélectionner</button>
                  <span className="text-slate-300 text-xs">|</span>
                  <button onClick={() => { setJsonPreview([]); setJsonInput('') }}
                    className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
                    <X size={11} /> Effacer
                  </button>
                  <Button
                    onClick={() => handleImportSelected(jsonPreview, setJsonPreview)}
                    loading={importMutation.isPending && singleImporting === null}
                    disabled={jsonSelected === 0}
                    icon={<Download size={13} />}
                    size="sm"
                  >
                    Importer {jsonSelected > 0 ? `(${jsonSelected})` : ''}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {jsonPreview.map((item, i) => (
                  <ScrapedProductCard
                    key={i}
                    item={item}
                    index={i}
                    onUpdate={(idx, patch) => setJsonPreview(s => s.map((x, j) => j === idx ? { ...x, ...patch } : x))}
                    onImportSingle={handleImportSingle}
                    importing={singleImporting === i}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <Confirm
        open={deleteProductId !== null}
        onClose={() => setDeleteProductId(null)}
        onConfirm={() => deleteProductId && deleteProd.mutate(deleteProductId)}
        loading={deleteProd.isPending}
        title="Supprimer ce produit ?"
        message="Le produit sera supprimé définitivement."
      />
    </div>
  )
}
