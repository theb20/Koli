import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Zap, Search, X, CheckSquare, Square, Package, Mail, Clock } from 'lucide-react'
import { api, fmt, fmtDateTime } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { PageTitle } from '../../components/layout/Sidebar'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { toDatetimeLocal, fromDatetimeLocal, getSaleState, SALE_STATE_BADGE } from '../../lib/saleWindow'
import type { Product, Category, DealAnnouncement } from '../../types'

type SaleFields = { salePrice: string; saleStartsAt: string; saleEndsAt: string }
const EMPTY_SALE: SaleFields = { salePrice: '', saleStartsAt: '', saleEndsAt: '' }

const SEGMENTS = [
  { value: 'all',      label: 'Tous les abonnés newsletter' },
  { value: 'buyers',   label: 'Clients ayant déjà acheté ce produit' },
  { value: 'inactive', label: 'Clients inactifs depuis X jours' },
]

const ANNOUNCEMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'En attente', sent: 'Envoyée', failed: 'Échec', cancelled: 'Annulée',
}

async function fetchProducts(params: Record<string, string | number>) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined).map(([k, v]) => [k, String(v)]))
  const { data } = await api.get(`/api/products?${q}`)
  return data.data as { products: Product[] }
}

export default function DealsPage() {
  const qc = useQueryClient()

  /* ── Promotions déjà programmées / actives / expirées ─────────────── */
  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ['products', 'deals'],
    queryFn: () => fetchProducts({ hasSale: 'true', limit: 100, sort: 'newest' }),
  })
  const deals = dealsData?.products ?? []

  const clearDeal = useMutation({
    mutationFn: (id: number) => api.put(`/api/products/${id}`, { salePrice: null, saleStartsAt: null, saleEndsAt: null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  /* ── Recherche de produits à ajouter à une promotion ───────────────── */
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-admin'],
    queryFn: async () => { const { data } = await api.get('/api/categories/admin'); return data.data as Category[] },
    staleTime: 5 * 60 * 1000,
  })
  const CATEGORIES = [{ value: '', label: 'Toutes catégories' }, ...(categoriesData ?? []).map(c => ({ value: c.slug, label: c.name }))]

  const { data: browseData, isLoading: browseLoading } = useQuery({
    queryKey: ['products', 'browse', debouncedSearch, category],
    queryFn: () => fetchProducts({ q: debouncedSearch, category, limit: 20, sort: 'newest' }),
  })
  const browseProducts = browseData?.products ?? []

  /* ── Sélection multi-produits ──────────────────────────────────────── */
  const [selected, setSelected] = useState<Map<number, Product>>(new Map())
  const [sameSettings, setSameSettings] = useState(true)
  const [sharedSale, setSharedSale]     = useState<SaleFields>(EMPTY_SALE)
  const [perProductSale, setPerProductSale] = useState<Record<number, SaleFields>>({})

  const selectedList = useMemo(() => Array.from(selected.values()), [selected])

  /* ── Annonce email automatique ─────────────────────────────────────── */
  const [announceEnabled, setAnnounceEnabled] = useState(false)
  const [announceSegment, setAnnounceSegment] = useState<'all' | 'buyers' | 'inactive'>('all')
  const [inactiveDays, setInactiveDays]       = useState('30')
  const [scheduleMode, setScheduleMode]       = useState<'immediate' | 'scheduled'>('immediate')
  const [announceSendAt, setAnnounceSendAt]   = useState('')

  function toggle(p: Product) {
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(p.id)) { next.delete(p.id); setPerProductSale(s => { const c = { ...s }; delete c[p.id]; return c }) }
      else next.set(p.id, p)
      return next
    })
  }

  function clearSelection() {
    setSelected(new Map())
    setSharedSale(EMPTY_SALE)
    setPerProductSale({})
    setAnnounceEnabled(false)
    setAnnounceSegment('all')
    setInactiveDays('30')
    setScheduleMode('immediate')
    setAnnounceSendAt('')
  }

  const bulkApply = useMutation({
    mutationFn: async () => {
      const productIds = selectedList.map(p => p.id)

      if (sameSettings) {
        await api.post('/api/products/bulk-sale', {
          productIds,
          salePrice:    sharedSale.salePrice ? Number(sharedSale.salePrice) : null,
          saleStartsAt: fromDatetimeLocal(sharedSale.saleStartsAt),
          saleEndsAt:   fromDatetimeLocal(sharedSale.saleEndsAt),
        })
      } else {
        await Promise.all(selectedList.map(p => {
          const s = perProductSale[p.id] ?? EMPTY_SALE
          return api.put(`/api/products/${p.id}`, {
            salePrice:    s.salePrice ? Number(s.salePrice) : null,
            saleStartsAt: fromDatetimeLocal(s.saleStartsAt),
            saleEndsAt:   fromDatetimeLocal(s.saleEndsAt),
          })
        }))
      }

      const isClearing = sameSettings && !sharedSale.salePrice
      if (announceEnabled && !isClearing) {
        await api.post('/api/deal-announcements', {
          productIds,
          segment: announceSegment,
          ...(announceSegment === 'inactive' ? { inactiveDays: Number(inactiveDays) } : {}),
          ...(scheduleMode === 'scheduled' && announceSendAt ? { sendAt: fromDatetimeLocal(announceSendAt) } : {}),
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['deal-announcements'] })
      clearSelection()
    },
  })

  /* ── Historique des annonces ────────────────────────────────────────── */
  const { data: announcements } = useQuery({
    queryKey: ['deal-announcements'],
    queryFn: async () => { const { data } = await api.get('/api/deal-announcements'); return data.data as DealAnnouncement[] },
  })

  const cancelAnnouncement = useMutation({
    mutationFn: (id: number) => api.delete(`/api/deal-announcements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal-announcements'] }),
  })

  const inputCls = "w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all"
  const cardCls  = "bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"

  const canApply = sameSettings
    ? (!sharedSale.salePrice || !!sharedSale.saleEndsAt)
    : selectedList.every(p => { const s = perProductSale[p.id] ?? EMPTY_SALE; return !s.salePrice || !!s.saleEndsAt })

  return (
    <div className="space-y-5">
      <PageTitle
        title="Deals du jour & Ventes flash"
        sub="Programmez, modifiez ou retirez des promotions à durée limitée — sur un ou plusieurs produits à la fois"
      />

      {/* ── Promotions en cours ─────────────────────────────────────── */}
      <div className={cardCls}>
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <Zap size={15} className="text-orange-500" /> Promotions programmées & actives
        </h3>
        {dealsLoading ? (
          <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
        ) : deals.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Aucune promotion programmée pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Produit', 'Prix normal', 'Prix promo', 'État', 'Début', 'Fin', ''].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {deals.map(p => {
                  const state = getSaleState(p.saleStartsAt, p.saleEndsAt)
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                            {p.images?.[0] && <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <p className="text-sm font-medium text-slate-900 truncate max-w-[220px]">{p.name}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-slate-400 line-through">{fmt(p.price)}</td>
                      <td className="px-3 py-2.5 text-sm font-semibold text-orange-600">{p.salePrice ? fmt(p.salePrice) : '—'}</td>
                      <td className="px-3 py-2.5">
                        {state !== 'none' && (
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${SALE_STATE_BADGE[state].cls}`}>
                            {SALE_STATE_BADGE[state].label}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{p.saleStartsAt ? toDatetimeLocal(p.saleStartsAt).replace('T', ' ') : 'Immédiat'}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{p.saleEndsAt ? toDatetimeLocal(p.saleEndsAt).replace('T', ' ') : '—'}</td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => clearDeal.mutate(p.id)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600 transition-colors">
                          <X size={12} /> Retirer
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Sélection de produits pour une nouvelle promotion ─────────── */}
      <div className={cardCls}>
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-1">
          <Package size={15} className="text-indigo-500" /> Ajouter des produits à une promotion
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Recherchez et sélectionnez un ou plusieurs produits, puis programmez la même promotion pour tous — ou un réglage différent pour chacun.
        </p>

        <div className="flex flex-wrap gap-3 mb-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un produit..." className={`${inputCls} pl-9`} />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls} style={{ width: 'auto' }}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[340px] overflow-y-auto">
          {browseLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
            </div>
          ) : browseProducts.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Aucun produit trouvé.</p>
          ) : (
            browseProducts.map(p => {
              const isSelected = selected.has(p.id)
              return (
                <button key={p.id} type="button" onClick={() => toggle(p)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-slate-50 last:border-0 text-left transition-colors ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}>
                  {isSelected ? <CheckSquare size={16} className="text-indigo-600 shrink-0" /> : <Square size={16} className="text-slate-300 shrink-0" />}
                  <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                    {p.images?.[0] && <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.brand} · {fmt(p.price)}</p>
                  </div>
                  {p.salePrice && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-orange-50 text-orange-700 border-orange-200 shrink-0">
                      Déjà en promo
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Panneau de configuration de la sélection ──────────────────── */}
      {selectedList.length > 0 && (
        <div className={`${cardCls} border-indigo-200 ring-1 ring-indigo-100`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">
              {selectedList.length} produit{selectedList.length > 1 ? 's' : ''} sélectionné{selectedList.length > 1 ? 's' : ''}
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-semibold">
                <button type="button" onClick={() => setSameSettings(true)}
                  className={`px-3 py-1.5 rounded-md transition-all ${sameSettings ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                  Même réglage pour tous
                </button>
                <button type="button" onClick={() => setSameSettings(false)}
                  className={`px-3 py-1.5 rounded-md transition-all ${!sameSettings ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                  Réglage individuel
                </button>
              </div>
              <button type="button" onClick={clearSelection} className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors">
                <X size={13} /> Annuler la sélection
              </button>
            </div>
          </div>

          {sameSettings ? (
            <div className="grid grid-cols-3 gap-4">
              <Input label="Prix promo (FCFA)" type="number" min={1} step={1}
                value={sharedSale.salePrice} onChange={e => setSharedSale(s => ({ ...s, salePrice: e.target.value }))} placeholder="4500" />
              <Input label="Début (optionnel — immédiat si vide)" type="datetime-local"
                value={sharedSale.saleStartsAt} onChange={e => setSharedSale(s => ({ ...s, saleStartsAt: e.target.value }))} />
              <Input label="Fin" type="datetime-local"
                value={sharedSale.saleEndsAt} onChange={e => setSharedSale(s => ({ ...s, saleEndsAt: e.target.value }))} />
            </div>
          ) : (
            <div className="space-y-3">
              {selectedList.map(p => {
                const s = perProductSale[p.id] ?? EMPTY_SALE
                const setField = (patch: Partial<SaleFields>) => setPerProductSale(prev => ({ ...prev, [p.id]: { ...s, ...patch } }))
                return (
                  <div key={p.id} className="grid grid-cols-4 gap-3 items-end border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                    <Input label="Prix promo" type="number" min={1} step={1} value={s.salePrice} onChange={e => setField({ salePrice: e.target.value })} placeholder="4500" />
                    <Input label="Début" type="datetime-local" value={s.saleStartsAt} onChange={e => setField({ saleStartsAt: e.target.value })} />
                    <Input label="Fin" type="datetime-local" value={s.saleEndsAt} onChange={e => setField({ saleEndsAt: e.target.value })} />
                  </div>
                )
              })}
            </div>
          )}

          {!canApply && (
            <p className="text-xs text-red-500 mt-3">Une date de fin est requise pour chaque prix promo saisi.</p>
          )}

          {/* Annonce email — masquée si on retire simplement la promo (mode même réglage, prix vide) */}
          {!(sameSettings && !sharedSale.salePrice) && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer select-none mb-3">
                <input type="checkbox" checked={announceEnabled} onChange={e => setAnnounceEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30" />
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Mail size={14} className="text-indigo-500" /> Annoncer cette promo par email
                </span>
              </label>

              {announceEnabled && (
                <div className="pl-6 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Destinataires" value={announceSegment}
                      onChange={e => setAnnounceSegment(e.target.value as typeof announceSegment)}
                      options={SEGMENTS} />
                    {announceSegment === 'inactive' && (
                      <Input label="Inactifs depuis (jours)" type="number" min={1} step={1}
                        value={inactiveDays} onChange={e => setInactiveDays(e.target.value)} />
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-semibold">
                      <button type="button" onClick={() => setScheduleMode('immediate')}
                        className={`px-3 py-1.5 rounded-md transition-all ${scheduleMode === 'immediate' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                        Envoi immédiat
                      </button>
                      <button type="button" onClick={() => setScheduleMode('scheduled')}
                        className={`px-3 py-1.5 rounded-md transition-all ${scheduleMode === 'scheduled' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
                        Programmer l'envoi
                      </button>
                    </div>
                    {scheduleMode === 'scheduled' && (
                      <Input type="datetime-local" value={announceSendAt} onChange={e => setAnnounceSendAt(e.target.value)} className="!py-2" />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button onClick={() => bulkApply.mutate()} loading={bulkApply.isPending} disabled={!canApply} icon={<Zap size={14} />}>
              Appliquer à {selectedList.length} produit{selectedList.length > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {/* ── Historique des annonces email ──────────────────────────────── */}
      {(announcements?.length ?? 0) > 0 && (
        <div className={cardCls}>
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <Mail size={15} className="text-indigo-500" /> Historique des annonces email
          </h3>
          <div className="space-y-2">
            {announcements!.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-slate-800">
                    {a.productIds.length} produit{a.productIds.length > 1 ? 's' : ''} · {SEGMENTS.find(s => s.value === a.segment)?.label}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock size={11} /> {a.status === 'sent' && a.sentAt ? `Envoyée le ${fmtDateTime(a.sentAt)}` : `Prévue le ${fmtDateTime(a.sendAt)}`}
                    {a.status === 'sent' && a.recipientCount != null && ` · ${a.recipientCount} destinataire${a.recipientCount > 1 ? 's' : ''}`}
                    {a.status === 'failed' && a.error && ` · ${a.error}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge label={ANNOUNCEMENT_STATUS_LABEL[a.status] ?? a.status}
                    color={a.status === 'sent' ? 'active' : a.status === 'failed' ? 'cancelled' : a.status === 'cancelled' ? 'inactive' : 'pending'} />
                  {a.status === 'pending' && (
                    <button onClick={() => cancelAnnouncement.mutate(a.id)}
                      className="text-[11px] font-semibold text-red-500 hover:text-red-600 transition-colors">
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
