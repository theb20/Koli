import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Package, Store, Upload } from 'lucide-react'
import { api, fmt, fmtDate } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Confirm } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { PageTitle } from '../../components/layout/Sidebar'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { BulkImportModal } from './BulkImportModal'
import type { Product, Category } from '../../types'


async function fetchProducts(params: Record<string, string | number>) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined).map(([k, v]) => [k, String(v)]))
  const { data } = await api.get(`/api/products?${q}`)
  return data.data
}

export default function ProductsPage() {
  const navigate    = useNavigate()
  const qc          = useQueryClient()
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort]         = useState('newest')
  const [storeId, setStoreId]   = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data: storesData } = useQuery({
    queryKey: ['stores-list'],
    queryFn: async () => { const { data } = await api.get('/api/stores/admin/all'); return data.data.stores as { id: number; name: string }[] },
    staleTime: 5 * 60 * 1000,
  })

  /* Catégories dynamiques — reflète les catégories créées côté admin */
  const { data: categoriesData } = useQuery({
    queryKey: ['categories-admin'],
    queryFn: async () => { const { data } = await api.get('/api/categories/admin'); return data.data as Category[] },
    staleTime: 5 * 60 * 1000,
  })
  const CATEGORIES = [{ value: '', label: 'Toutes catégories' }, ...(categoriesData ?? []).map(c => ({ value: c.slug, label: c.name }))]

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, debouncedSearch, category, sort, storeId],
    queryFn: () => fetchProducts({ page, limit: 15, q: debouncedSearch, category, sort, storeId }),
    placeholderData: (prev) => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setDeleteId(null) },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.put(`/api/products/${id}`, { isActive: !isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const products: Product[] = data?.products ?? []
  const pagination          = data?.pagination

  const inputCls = "w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none transition-all"

  return (
    <div className="space-y-5">
      <PageTitle
        title="Produits"
        sub={`${pagination?.total ?? 0} produits au total`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={<Upload size={15} />} onClick={() => setBulkOpen(true)}>Import CSV</Button>
            <Button icon={<Plus size={15} />} onClick={() => navigate('/products/new')}>Nouveau produit</Button>
          </div>
        }
      />
      <BulkImportModal open={bulkOpen} onClose={() => setBulkOpen(false)} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher un produit..."
            className={`${inputCls} pl-9`}
          />
        </div>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }} className={inputCls} style={{ width: 'auto' }}>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className={inputCls} style={{ width: 'auto' }}>
          <option value="newest">Plus récents</option>
          <option value="popular">Populaires</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
          <option value="rating">Mieux notés</option>
        </select>
        {(storesData?.length ?? 0) > 0 && (
          <select value={storeId} onChange={e => { setStoreId(e.target.value); setPage(1) }} className={inputCls} style={{ width: 'auto' }}>
            <option value="">Tous les magasins</option>
            {storesData?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['Produit', 'Catégorie', 'Prix', 'Stock', 'Vendu', 'Note', 'Badge', 'Statut', 'Créé le', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={10} className="px-4 py-3"><div className="h-8 bg-slate-100 rounded-lg animate-pulse" /></td></tr>
              ))
            ) : products.length === 0 ? (
              <tr><td colSpan={10} className="py-16 text-center">
                <Package size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Aucun produit trouvé</p>
              </td></tr>
            ) : (
              products.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                        {p.images?.[0] && <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate max-w-[180px]">{p.name}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs text-slate-400">{p.brand}</p>
                          {p.store && (
                            <button onClick={e => { e.stopPropagation(); navigate(`/stores/${p.store!.id}`) }}
                              className="flex items-center gap-0.5 text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md hover:bg-indigo-100 transition-colors">
                              <Store size={9} />{p.store.name}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 capitalize">{p.category}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{fmt(p.price)}</p>
                    {p.oldPrice && <p className="text-xs text-slate-400 line-through">{fmt(p.oldPrice)}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${p.stock < 5 ? 'text-orange-600' : p.stock === 0 ? 'text-red-500' : 'text-slate-900'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{p.sold}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">⭐ {p.rating.toFixed(1)}</td>
                  <td className="px-4 py-3">{p.badge ? <Badge label={p.badge} /> : <span className="text-slate-300 text-xs">—</span>}</td>
                  <td className="px-4 py-3"><Badge label={p.isActive ? 'active' : 'inactive'} /></td>
                  <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => navigate(`/products/${p.id}`)}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all" title="Modifier">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => toggleActive.mutate({ id: p.id, isActive: p.isActive })}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all" title={p.isActive ? 'Désactiver' : 'Activer'}>
                        {p.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => setDeleteId(p.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all" title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {pagination && (
          <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={15} onChange={setPage} />
        )}
      </div>

      <Confirm
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        title="Supprimer le produit ?"
        message="Cette action désactivera le produit (il ne sera plus visible sur le site)."
      />
    </div>
  )
}
