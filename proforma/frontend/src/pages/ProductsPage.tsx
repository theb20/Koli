import { useEffect, useState } from 'react'
import { Package, Search, Plus, Trash2, Pencil } from '../components/ui/Icon'
import { api } from '../lib/api'
import { formatMoney } from '../lib/money'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { SkeletonRows } from '../components/ui/Skeleton'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ProductFormModal } from '../components/product/ProductFormModal'
import type { Product, Tax } from '../types'

export default function ProductsPage() {
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId)
  const pushToast = useUiStore((s) => s.pushToast)
  const [products, setProducts] = useState<Product[] | null>(null)
  const [taxes, setTaxes] = useState<Tax[]>([])
  const [q, setQ] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null)

  async function load() {
    if (!activeCompanyId) return
    const params = q ? `?q=${encodeURIComponent(q)}` : ''
    const [p, t] = await Promise.all([
      api.get<{ products: Product[] }>(`/api/companies/${activeCompanyId}/products${params}`),
      api.get<{ taxes: Tax[] }>(`/api/companies/${activeCompanyId}/taxes`),
    ])
    setProducts(p.products)
    setTaxes(t.taxes)
  }

  useEffect(() => {
    const handle = setTimeout(load, 200)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId, q])

  async function handleDelete() {
    if (!confirmDelete) return
    await api.delete(`/api/products/${confirmDelete.id}`)
    pushToast('Produit supprimé', 'success')
    setConfirmDelete(null)
    load()
  }

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Produits & services</h1>
          <p className="text-sm text-muted">Votre catalogue réutilisable dans les proformas.</p>
        </div>
        <Button
          icon={<Plus size={15} />}
          onClick={() => {
            setEditing(undefined)
            setFormOpen(true)
          }}
        >
          Nouveau produit
        </Button>
      </div>

      <div className="flex items-center gap-2 border border-border bg-white px-3 py-2 sm:max-w-sm">
        <Search size={15} className="text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un produit…" className="w-full bg-transparent text-sm focus:outline-none" />
      </div>

      {!products ? (
        <SkeletonRows rows={5} />
      ) : products.length === 0 ? (
        <EmptyState icon={<Package size={20} />} title="Aucun produit" description="Ajoutez vos produits et services pour les réutiliser rapidement dans vos proformas." action={<Button onClick={() => setFormOpen(true)}>Nouveau produit</Button>} />
      ) : (
        <div className="overflow-x-auto border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Référence</th>
                <th className="px-3 py-3">Nom</th>
                <th className="px-3 py-3">Catégorie</th>
                <th className="px-3 py-3 text-right">Prix unitaire</th>
                <th className="px-3 py-3">Taxe</th>
                <th className="px-3 py-3">Stock</th>
                <th className="w-20 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-muted">{p.reference || '—'}</td>
                  <td className="px-3 py-3 font-semibold text-ink">{p.name}</td>
                  <td className="px-3 py-3 text-muted">{p.category || '—'}</td>
                  <td className="px-3 py-3 text-right text-ink">
                    {formatMoney(p.unitPrice, 'XOF')} / {p.unit}
                  </td>
                  <td className="px-3 py-3 text-muted">{p.defaultTax ? `${p.defaultTax.name} ${p.defaultTax.rate}%` : '—'}</td>
                  <td className="px-3 py-3">
                    {p.trackStock ? (
                      <span
                        className={`inline-flex items-center px-2 py-1 text-[11px] font-bold ${
                          p.stockQuantity <= p.lowStockThreshold ? 'bg-red-50 text-danger' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {p.stockQuantity} en stock
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditing(p)
                          setFormOpen(true)
                        }}
                        className="p-1.5 text-muted hover:bg-gray-100"
                      >
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete(p)} className="p-1.5 text-muted hover:bg-red-50 hover:text-danger">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProductFormModal open={formOpen} onClose={() => setFormOpen(false)} product={editing} companyId={activeCompanyId!} taxes={taxes} onSaved={load} />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Supprimer le produit"
        message={`Supprimer ${confirmDelete?.name} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
