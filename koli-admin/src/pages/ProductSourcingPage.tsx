import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Search, Truck, AlertTriangle, CheckCircle2, ImageOff, Globe, ExternalLink, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import { formatFCFA, formatNumber } from '../lib/format'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Tabs } from '../components/ui/Tabs'
import { Pagination } from '../components/ui/Pagination'
import { StatusPill } from '../components/ui/Badge'
import { CardSkeleton, EmptyState, ErrorState } from '../components/ui/States'

/* ─────────────────────────────────────────────────────────────
   Produits à compléter — produits du catalogue Skignas sans fournisseur
   ou sans prix d'achat, corrigés EN MASSE :
   - cocher des produits → les attribuer à un fournisseur en un clic ;
   - saisir fournisseur / prix d'achat directement dans le tableau, puis
     tout enregistrer d'un coup.
   Les boutiques marchandes ne sont pas concernées (commission merchantgo).
   Les changements ne valent que pour les ventes futures : les commandes
   déjà payées gardent les coûts figés au paiement.
───────────────────────────────────────────────────────────── */

type Filter = 'no_supplier' | 'no_price' | 'all'
type Row = {
  id: number; name: string; brand: string; category: string; price: number; isActive: boolean; sold: number
  image: string | null; supplierId: number | null; supplierPrice: number | null
}
type Supplier = { id: number; name: string; mode: 'MARGIN' | 'COMMISSION'; commissionRate: number | null; isActive: boolean }
type Data = { counts: { noSupplier: number; noPrice: number; catalog: number }; pagination: { page: number; limit: number; total: number; totalPages: number }; products: Row[] }
/** Modification en attente : seuls les champs touchés sont envoyés (null = vider). */
type Draft = { supplierId?: number | null; supplierPrice?: number | null; price?: number }

type Offer = { title: string; source: string; originalAmount: number; currency: string; priceLabel: string; rate: number; priceFcfa: number; link: string | null; thumbnail: string | null }
type PriceResult = { query: string; offers: Offer[]; cached: boolean }

/** Fenêtre « Comparer les prix » : prix publics trouvés sur Internet, à reporter dans le brouillon du prix d'achat. */
const readNum = (key: string, fallback: string) => { try { return localStorage.getItem(key) ?? fallback } catch { return fallback } }
const writeNum = (key: string, v: string) => { try { localStorage.setItem(key, v) } catch { /* stockage indisponible */ } }
const toInt = (v: string) => (/^\d{1,10}$/.test(v.replace(/[\s\u00A0\u202F]/g, '')) ? Number(v.replace(/[\s\u00A0\u202F]/g, '')) : 0)

function PriceCompareModal({ row, onClose, onUse }: { row: Row | null; onClose: () => void; onUse: (v: { cost: number; price: number }) => void }) {
  const [shipping, setShipping] = useState(() => readNum('sourcing.shipping', '0'))
  const [margin, setMargin] = useState(() => readNum('sourcing.margin', '20'))
  const shippingFcfa = toInt(shipping)
  const marginPct = Math.min(1000, Number(margin.replace(',', '.')) || 0)
  /** Prix de vente conseillé : coût de revient + marge, arrondi à la centaine supérieure */
  const suggest = (converted: number) => { const cost = converted + shippingFcfa; return { cost, price: Math.ceil((cost * (1 + marginPct / 100)) / 100) * 100 } }
  const search = useQuery({
    queryKey: ['price-search', row?.id],
    enabled: row !== null,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => (await api.post('/api/admin/suppliers/price-search', { productId: row!.id })).data.data as PriceResult,
  })
  const refresh = useMutation({
    mutationFn: async () => (await api.post('/api/admin/suppliers/price-search', { productId: row!.id, refresh: true })).data.data as PriceResult,
    onSuccess: d => search.refetch().then(() => d),
    onError: e => toast.error(errMsg(e)),
  })
  const offers = search.data?.offers ?? []
  return (
    <Modal open={row !== null} onClose={onClose} title={row ? `Prix sur Internet — ${row.name}` : ''} width="max-w-2xl">
      {search.isLoading ? <CardSkeleton lines={4} />
        : search.isError ? <ErrorState onRetry={() => search.refetch()} />
        : offers.length === 0 ? <EmptyState icon={<Globe size={22} />} title="Aucun prix trouvé" text="Essayez de préciser le nom ou la marque du produit." />
        : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-caption text-muted">Frais de livraison (F CFA)
                <input inputMode="numeric" value={shipping} onChange={e => { setShipping(e.target.value); writeNum('sourcing.shipping', e.target.value) }}
                  className="mt-1 h-9 w-full rounded-input border border-line bg-card px-2.5 text-secondary text-ink tabular" />
              </label>
              <label className="text-caption text-muted">Marge souhaitée (%)
                <input inputMode="decimal" value={margin} onChange={e => { setMargin(e.target.value); writeNum('sourcing.margin', e.target.value) }}
                  className="mt-1 h-9 w-full rounded-input border border-line bg-card px-2.5 text-secondary text-ink tabular" />
              </label>
            </div>
            <p className="text-caption text-muted">
              Recherche « {search.data?.query} » · prix convertis en F CFA (taux indicatifs), à vérifier avant usage
              {search.data?.cached && ' · résultat en cache (< 24 h)'}
            </p>
            <ul className="divide-y divide-line">
              {offers.map((o, i) => {
                const { cost, price: suggested } = suggest(o.priceFcfa)
                return (
                  <li key={i} className="py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-secondary text-ink line-clamp-1">{o.title}</p>
                      <p className="text-caption text-muted flex items-center gap-2">
                        {o.source}
                        {o.link && <a href={o.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:underline">Voir <ExternalLink size={11} aria-hidden /></a>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium tabular">{formatFCFA(o.priceFcfa)}</p>
                      {o.currency !== 'XOF' && <p className="text-caption text-muted tabular">{o.priceLabel} · 1 {o.currency} = {formatNumber(o.rate)} F</p>}
                      <p className="text-caption text-muted tabular">Revient à {formatFCFA(cost)}</p>
                      <p className="text-caption text-emerald-700 tabular">Vente conseillée {formatFCFA(suggested)}</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => onUse({ cost, price: suggested })}>Utiliser</Button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      {row && !search.isLoading && (
        <div className="mt-4 flex justify-end">
          <Button size="sm" variant="ghost" icon={<RefreshCw size={14} />} loading={refresh.isPending} onClick={() => refresh.mutate()}>Relancer la recherche</Button>
        </div>
      )}
    </Modal>
  )
}

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Échec de l'enregistrement"

export default function ProductSourcingPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>('no_supplier')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [drafts, setDrafts] = useState<Map<number, Draft>>(new Map())
  const [bulkSupplier, setBulkSupplier] = useState('')
  const [compare, setCompare] = useState<Row | null>(null)

  const list = useQuery({
    queryKey: ['product-sourcing-list', filter, q, page],
    queryFn: async () => (await api.get('/api/admin/suppliers/sourcing', { params: { filter, q: q || undefined, page, limit: 50 } })).data.data as Data,
    placeholderData: keepPreviousData,
  })
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get('/api/admin/suppliers')).data.data.suppliers as Supplier[],
  })
  const active = suppliers.filter(s => s.isActive)
  const supplierById = useMemo(() => new Map(suppliers.map(s => [s.id, s])), [suppliers])

  const save = useMutation({
    mutationFn: (items: (Draft & { productId: number })[]) => api.put('/api/admin/suppliers/sourcing', { items }),
    onSuccess: (_res, items) => {
      toast.success(`${formatNumber(items.length)} produit${items.length > 1 ? 's' : ''} mis à jour`)
      setDrafts(new Map()); setSelected(new Set()); setBulkSupplier('')
      qc.invalidateQueries({ queryKey: ['product-sourcing-list'] })
      qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: e => toast.error(errMsg(e)),
  })

  const rows = list.data?.products ?? []
  const counts = list.data?.counts
  const effective = (r: Row) => ({ ...r, ...drafts.get(r.id) })
  const setDraft = (r: Row, patch: Draft) => setDrafts(prev => {
    const next = new Map(prev)
    const d = { ...next.get(r.id), ...patch }
    // Revenu à la valeur d'origine : ce champ n'est plus une modification
    if (d.supplierId !== undefined && d.supplierId === r.supplierId) delete d.supplierId
    if (d.supplierPrice !== undefined && d.supplierPrice === r.supplierPrice) delete d.supplierPrice
    if (d.price !== undefined && d.price === r.price) delete d.price
    if (Object.keys(d).length) next.set(r.id, d); else next.delete(r.id)
    return next
  })

  const allOnPage = rows.length > 0 && rows.every(r => selected.has(r.id))
  const toggleAll = () => setSelected(prev => {
    const next = new Set(prev)
    rows.forEach(r => (allOnPage ? next.delete(r.id) : next.add(r.id)))
    return next
  })
  const toggle = (id: number) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const applyBulk = () => {
    if (!bulkSupplier || selected.size === 0) return
    save.mutate([...selected].map(productId => ({ productId, supplierId: Number(bulkSupplier) })))
  }
  const saveDrafts = () => save.mutate([...drafts.entries()].map(([productId, d]) => ({ productId, ...d })))
  const changeTab = (f: Filter) => { setFilter(f); setPage(1); setSelected(new Set()) }

  return (
    <>
      <PageHeader title="Produits à compléter"
        subtitle="Produits du catalogue Skignas sans fournisseur ou sans prix d'achat : sans ces données, leurs ventes sont exclues des calculs de marge."
        actions={<Link to="/suppliers"><Button variant="secondary" size="sm" icon={<ArrowLeft size={14} />}>Fournisseurs</Button></Link>} />

      <div className="space-y-[18px]">
        <Card padded className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs label="Produits à afficher" value={filter} onChange={changeTab} tabs={[
            { value: 'no_supplier', label: 'Sans fournisseur', count: counts?.noSupplier },
            { value: 'no_price', label: "Sans prix d'achat", count: counts?.noPrice },
            { value: 'all', label: 'Tout le catalogue', count: counts?.catalog },
          ]} />
          <form className="relative w-full lg:w-72" onSubmit={e => { e.preventDefault(); setQ(search.trim()); setPage(1) }}>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input value={search} onChange={e => setSearch(e.target.value)} onBlur={() => { setQ(search.trim()); setPage(1) }}
              placeholder="Nom ou marque…" aria-label="Rechercher un produit"
              className="w-full h-9 pl-9 pr-3 rounded-input border border-line bg-card text-body text-ink" />
          </form>
        </Card>

        {selected.size > 0 && (
          <Card padded className="flex flex-col gap-3 sm:flex-row sm:items-center border-primary/40">
            <p className="text-body text-ink font-medium">{formatNumber(selected.size)} produit{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}</p>
            <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
              <label className="sr-only" htmlFor="bulk-supplier">Fournisseur à attribuer</label>
              <select id="bulk-supplier" value={bulkSupplier} onChange={e => setBulkSupplier(e.target.value)}
                className="h-9 min-w-56 rounded-input border border-line bg-card px-3 text-body text-ink">
                <option value="">Choisir un fournisseur…</option>
                {active.map(s => <option key={s.id} value={s.id}>{s.name} — {s.mode === 'COMMISSION' ? `commission ${s.commissionRate ?? '?'} %` : 'marge'}</option>)}
              </select>
              <Button size="sm" icon={<Truck size={14} />} disabled={!bulkSupplier} loading={save.isPending} onClick={applyBulk}>Attribuer</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Désélectionner</Button>
            </div>
          </Card>
        )}

        {list.isLoading ? <CardSkeleton lines={6} />
          : list.isError ? <Card padded><ErrorState onRetry={() => list.refetch()} /></Card>
          : rows.length === 0 ? (
            <Card padded><EmptyState icon={<CheckCircle2 size={22} />} title={q ? 'Aucun produit trouvé' : 'Tout est complet'}
              text={q ? 'Essayez un autre nom ou une autre marque.' : filter === 'all' ? 'Aucun produit dans le catalogue Skignas.' : 'Aucun produit à compléter dans cette catégorie.'} /></Card>
          ) : (
            <Card className={`overflow-x-auto ${list.isPlaceholderData ? 'opacity-60' : ''}`}>
              <table className="w-full text-secondary">
                <thead>
                  <tr className="border-b border-line text-left text-caption text-muted">
                    <th className="px-4 py-3 w-10"><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Tout sélectionner sur cette page" className="w-4 h-4 accent-[var(--primary)]" /></th>
                    <th className="px-4 py-3 font-medium">Produit</th>
                    <th className="px-4 py-3 font-medium text-right">Prix de vente HT</th>
                    <th className="px-4 py-3 font-medium min-w-52">Fournisseur</th>
                    <th className="px-4 py-3 font-medium min-w-40">Prix d'achat HT (F CFA)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const e = effective(r)
                    const supplier = e.supplierId != null ? supplierById.get(e.supplierId) : undefined
                    const needsPrice = (supplier?.mode ?? 'MARGIN') === 'MARGIN' && e.supplierPrice == null
                    const dirty = drafts.has(r.id)
                    return (
                      <tr key={r.id} className={`border-b border-line last:border-0 ${dirty ? 'bg-amber-50/60' : ''}`}>
                        <td className="px-4 py-3"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Sélectionner ${r.name}`} className="w-4 h-4 accent-[var(--primary)]" /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-10 h-10 rounded-input bg-muted-fill overflow-hidden shrink-0 flex items-center justify-center">
                              {r.image ? <img src={r.image} alt="" className="w-full h-full object-cover" loading="lazy" /> : <ImageOff size={14} className="text-muted" aria-hidden />}
                            </span>
                            <div className="min-w-0">
                              <Link to={`/products/${r.id}`} className="font-medium text-ink hover:underline line-clamp-1">{r.name}</Link>
                              <p className="text-caption text-muted">{r.brand} · {r.category} · {formatNumber(r.sold)} vendu{r.sold > 1 ? 's' : ''}</p>
                              {!r.isActive && <StatusPill tone="gray" className="mt-1">Inactif</StatusPill>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular whitespace-nowrap">
                          {formatFCFA(e.price)}
                          {e.price !== r.price && <p className="text-caption text-muted line-through">{formatFCFA(r.price)}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <select value={e.supplierId ?? ''} aria-label={`Fournisseur de ${r.name}`}
                            onChange={ev => setDraft(r, { supplierId: ev.target.value ? Number(ev.target.value) : null })}
                            className="h-9 w-full rounded-input border border-line bg-card px-2.5 text-secondary text-ink">
                            <option value="">— Aucun —</option>
                            {suppliers.filter(s => s.isActive || s.id === e.supplierId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          {supplier?.mode === 'COMMISSION' && <p className="text-caption text-muted mt-1">Commission {supplier.commissionRate ?? '?'} % : pas de prix d'achat</p>}
                        </td>
                        <td className="px-4 py-3">
                          <input inputMode="numeric" value={e.supplierPrice ?? ''} placeholder={needsPrice ? 'À renseigner' : '—'} aria-label={`Prix d'achat de ${r.name}`}
                            onChange={ev => {
                              const v = ev.target.value.replace(/[\s\u00A0\u202F]/g, '')
                              if (v === '') { setDraft(r, { supplierPrice: null }); return }
                              if (/^\d{1,10}$/.test(v)) setDraft(r, { supplierPrice: Number(v) })
                            }}
                            className={`h-9 w-full rounded-input border bg-card px-2.5 text-secondary text-ink tabular ${needsPrice ? 'border-amber-300' : 'border-line'}`} />
                          <button type="button" onClick={() => setCompare(r)} className="mt-1 inline-flex items-center gap-1 text-caption text-primary hover:underline">
                            <Globe size={11} aria-hidden /> Comparer les prix
                          </button>
                          {needsPrice && <p className="text-caption text-amber-800 mt-1 flex items-center gap-1"><AlertTriangle size={11} aria-hidden /> Requis en mode marge</p>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
          )}

        {list.data && <Pagination page={page} totalPages={list.data.pagination.totalPages} total={list.data.pagination.total} limit={list.data.pagination.limit} onChange={setPage} />}

        {/* Collante en bas de la zone de contenu (jamais sous le menu latéral) */}
        {drafts.size > 0 && (
          <div className="sticky bottom-4 z-30 rounded-card border border-line bg-card/95 backdrop-blur px-4 py-3 shadow-[var(--popover-shadow)] flex flex-wrap items-center justify-between gap-3">
            <p className="text-body text-ink">
              <strong className="font-semibold">{formatNumber(drafts.size)}</strong> modification{drafts.size > 1 ? 's' : ''} non enregistrée{drafts.size > 1 ? 's' : ''}
              <span className="text-muted"> · prix d'achat et de vente : ventes futures uniquement</span>
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDrafts(new Map())}>Annuler</Button>
              <Button size="sm" loading={save.isPending} onClick={saveDrafts}>Enregistrer</Button>
            </div>
          </div>
        )}
      </div>

      <PriceCompareModal row={compare} onClose={() => setCompare(null)}
        onUse={({ cost, price }) => { if (compare) setDraft(compare, { supplierPrice: cost, price }); setCompare(null); toast.success("Prix d'achat et prix de vente reportés : pensez à enregistrer") }} />
    </>
  )
}
