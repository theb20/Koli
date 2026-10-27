import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, ExternalLink, AlertTriangle, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { formatFCFA, formatNumber } from '../lib/format'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/States'
import type { Category } from '../types'

/* ─────────────────────────────────────────────────────────────
   Recherche produit — taper un nom : prix publics en ligne (convertis en
   F CFA, avec livraison et marge) + brouillon de fiche (marque, catégorie,
   description, caractéristiques) rédigé par IA. « Créer le produit » ouvre
   le formulaire produit habituel PRÉ-REMPLI : rien n'est publié avant
   validation, et les images sont rapatriées à l'enregistrement.
───────────────────────────────────────────────────────────── */

type Offer = { title: string; source: string; originalAmount: number; currency: string; priceLabel: string; rate: number; priceFcfa: number; link: string | null; thumbnail: string | null }
type Draft = { name: string; brand: string; category: string; description: string; specs: { label: string; value: string }[] }
type Result = { query: string; offers: Offer[]; images: string[]; draft: Draft | null; cached: boolean; pricesAvailable: boolean; draftAvailable: boolean }

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Recherche impossible'
const field = 'w-full rounded-input border border-line bg-card px-2.5 text-secondary text-ink'
const store = {
  get: (k: string, d: string) => { try { return localStorage.getItem(k) ?? d } catch { return d } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* indisponible */ } },
}
const toInt = (v: string) => { const c = v.replace(/\s/g, ''); return /^\d{1,10}$/.test(c) ? Number(c) : 0 }

export default function ProductSearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Draft>({ name: '', brand: '', category: '', description: '', specs: [] })
  const [images, setImages] = useState<string[]>([])
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  const [shipping, setShipping] = useState(() => store.get('sourcing.shipping', '0'))
  const [margin, setMargin] = useState(() => store.get('sourcing.margin', '20'))

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-admin'],
    queryFn: async () => (await api.get('/api/categories/admin')).data.data as Category[],
    staleTime: 5 * 60_000,
  })

  const search = useMutation({
    mutationFn: async (refresh: boolean) => (await api.post('/api/admin/product-search', { query: query.trim(), refresh })).data.data as Result,
    onSuccess: r => {
      setDraft(r.draft ?? { name: query.trim(), brand: '', category: '', description: '', specs: [] })
      setImages(r.images); setChosen(new Set(r.images.slice(0, 1)))
      if (!r.pricesAvailable) toast.warning('Prix indisponibles (clé SerpApi manquante ou service en panne)')
      if (!r.draftAvailable) toast.warning('Fiche non générée (clé Groq manquante ou service en panne) : remplissez-la à la main')
    },
    onError: e => toast.error(errMsg(e)),
  })
  const result = search.data

  const marginPct = Math.min(1000, Number(margin.replace(',', '.')) || 0)
  const shippingFcfa = toInt(shipping)
  const suggest = (converted: number) => { const cost = converted + shippingFcfa; return { cost, price: Math.ceil((cost * (1 + marginPct / 100)) / 100) * 100 } }

  /** Ouvre le formulaire produit pré-rempli (prix d'achat + vente si une offre est choisie) */
  const create = (offer?: { cost: number; price: number }) => {
    if (!draft.name.trim()) { toast.error('Le nom du produit est requis'); return }
    const urls = images.filter(u => chosen.has(u))
    navigate('/products/new', { state: { prefill: {
      name: draft.name, brand: draft.brand, category: draft.category, description: draft.description,
      specs: draft.specs, images: urls.length ? urls.map(url => ({ url })) : [{ url: '' }],
      ...(offer ? { price: offer.price, supplierPrice: offer.cost } : {}),
    } } })
  }

  return (
    <>
      <PageHeader title="Recherche produit"
        subtitle="Tapez un nom : prix sur Internet, description, caractéristiques et catégorie sont préparés pour créer la fiche produit." />
      <div className="space-y-[18px]">
        <Card padded>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={e => { e.preventDefault(); if (query.trim().length >= 3) search.mutate(false) }}>
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Ex. : Samsung Galaxy A15 128 Go" aria-label="Nom du produit"
                className={`${field} h-10 pl-9`} />
            </div>
            <Button type="submit" loading={search.isPending} disabled={query.trim().length < 3}>Rechercher</Button>
          </form>
        </Card>

        {!result && !search.isPending && <Card padded><EmptyState icon={<Search size={22} />} title="Aucune recherche" text="Saisissez au moins 3 caractères, avec la marque et le modèle pour de meilleurs résultats." /></Card>}

        {result && (
          <div className="grid gap-[18px] lg:grid-cols-2">
            <Card padded className="space-y-3">
              <h2 className="text-body font-semibold text-ink">Fiche produit (brouillon)</h2>
              <p className="text-caption text-amber-800 flex items-center gap-1"><AlertTriangle size={12} aria-hidden /> Rédigé par IA : relisez et corrigez avant de publier.</p>
              <label className="block text-caption text-muted">Nom
                <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className={`${field} h-9 mt-1`} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-caption text-muted">Marque
                  <input value={draft.brand} onChange={e => setDraft({ ...draft, brand: e.target.value })} className={`${field} h-9 mt-1`} /></label>
                <label className="block text-caption text-muted">Catégorie
                  <select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} className={`${field} h-9 mt-1`}>
                    <option value="">— Choisir —</option>
                    {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select></label>
              </div>
              <label className="block text-caption text-muted">Description
                <textarea value={draft.description} rows={5} onChange={e => setDraft({ ...draft, description: e.target.value })} className={`${field} mt-1 py-2`} /></label>
              {draft.specs.length > 0 && (
                <div>
                  <p className="text-caption text-muted mb-1">Caractéristiques</p>
                  <ul className="space-y-1">
                    {draft.specs.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <input value={s.label} aria-label="Libellé" onChange={e => setDraft({ ...draft, specs: draft.specs.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} className={`${field} h-8 w-2/5`} />
                        <input value={s.value} aria-label="Valeur" onChange={e => setDraft({ ...draft, specs: draft.specs.map((x, j) => j === i ? { ...x, value: e.target.value } : x) })} className={`${field} h-8 flex-1`} />
                        <button type="button" aria-label="Retirer" className="text-muted hover:text-ink px-1" onClick={() => setDraft({ ...draft, specs: draft.specs.filter((_, j) => j !== i) })}>×</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {images.length > 0 && (
                <div>
                  <p className="text-caption text-muted mb-1">Images trouvées (cliquez pour garder) — miniatures de faible qualité, à remplacer si besoin</p>
                  <div className="flex flex-wrap gap-2">
                    {images.map(u => (
                      <button key={u} type="button" aria-pressed={chosen.has(u)}
                        onClick={() => setChosen(p => { const n = new Set(p); if (n.has(u)) n.delete(u); else n.add(u); return n })}
                        className={`w-16 h-16 rounded-input overflow-hidden border-2 ${chosen.has(u) ? 'border-primary' : 'border-line opacity-60'}`}>
                        <img src={u} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Button icon={<Plus size={14} />} onClick={() => create()}>Créer le produit (sans prix)</Button>
            </Card>

            <Card padded className="space-y-3">
              <h2 className="text-body font-semibold text-ink">Prix sur Internet</h2>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-caption text-muted">Frais de livraison (F CFA)
                  <input inputMode="numeric" value={shipping} onChange={e => { setShipping(e.target.value); store.set('sourcing.shipping', e.target.value) }} className={`${field} h-9 mt-1 tabular`} /></label>
                <label className="text-caption text-muted">Marge souhaitée (%)
                  <input inputMode="decimal" value={margin} onChange={e => { setMargin(e.target.value); store.set('sourcing.margin', e.target.value) }} className={`${field} h-9 mt-1 tabular`} /></label>
              </div>
              {result.offers.length === 0 ? (
                <EmptyState icon={<Search size={22} />} title="Aucun prix trouvé" text="Précisez la marque ou le modèle, ou créez le produit sans prix." />
              ) : (
                <>
                  <p className="text-caption text-muted">Prix convertis en F CFA (taux indicatifs){result.cached && ' · résultat en cache (< 24 h)'}</p>
                  <ul className="divide-y divide-line">
                    {result.offers.map((o, i) => {
                      const s = suggest(o.priceFcfa)
                      return (
                        <li key={i} className="py-3 flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-secondary text-ink line-clamp-1">{o.title}</p>
                            <p className="text-caption text-muted flex items-center gap-2">{o.source}
                              {o.link && <a href={o.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:underline">Voir <ExternalLink size={11} aria-hidden /></a>}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-medium tabular">{formatFCFA(o.priceFcfa)}</p>
                            {o.currency !== 'XOF' && <p className="text-caption text-muted tabular">{o.priceLabel} · 1 {o.currency} = {formatNumber(o.rate)} F</p>}
                            <p className="text-caption text-muted tabular">Revient à {formatFCFA(s.cost)}</p>
                            <p className="text-caption text-emerald-700 tabular">Vente conseillée {formatFCFA(s.price)}</p>
                          </div>
                          <Button size="sm" variant="secondary" onClick={() => create(s)}>Créer avec ce prix</Button>
                        </li>
                      )
                    })}
                  </ul>
                  <Button size="sm" variant="ghost" loading={search.isPending} onClick={() => search.mutate(true)}>Relancer la recherche</Button>
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    </>
  )
}
