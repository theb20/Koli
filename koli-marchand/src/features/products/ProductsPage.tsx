import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { FilterPills } from '@/components/ui/FilterPills'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ActionsMenu } from '@/components/ui/ActionsMenu'
import { fmtFcfa } from '@/lib/format'
import { productStatusMap } from '@/lib/statusMaps'
import type { Product, ProductInput, ProductStatus } from '@/types'
import { useCreateProduct, useDeleteProduct, useDuplicateProduct, useProducts, useUpdateProduct } from './api/useProducts'
import { ProductFormModal } from './components/ProductFormModal'

type StatusFilter = ProductStatus | 'all'

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState<StatusFilter>('all')
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [modalMode, setModalMode] = useState<'create' | Product | null>(null)

  const { data, isLoading } = useProducts({ status, search })
  const { data: allData } = useProducts({ status: 'all', search: '' })
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const duplicateProduct = useDuplicateProduct()

  const products = data?.items ?? []
  const outOfStockCount = useMemo(
    () => (allData?.items ?? []).filter((p) => p.status === 'out_of_stock').length,
    [allData],
  )

  const closeModal = () => setModalMode(null)

  const handleSubmit = (input: ProductInput) => {
    if (modalMode === 'create') {
      createProduct.mutate(input, { onSuccess: closeModal })
    } else if (modalMode) {
      updateProduct.mutate({ id: modalMode.id, input }, { onSuccess: closeModal })
    }
  }

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'product',
      header: 'Produit',
      render: (p) => (
        <div className="flex items-center gap-3 min-w-[220px]">
          <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-[#f5f5f3]" />
          <div className="min-w-0">
            <p className="font-semibold text-[#0a0a0b] truncate">{p.name}</p>
            <p className="text-xs text-[#a3a3a1]">{p.sku}</p>
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Catégorie', render: (p) => p.category },
    { key: 'price', header: 'Prix', align: 'right', render: (p) => <span className="font-semibold">{fmtFcfa(p.price)}</span> },
    { key: 'stock', header: 'Stock', align: 'right', render: (p) => (p.stock === 0 ? <span className="text-rose-600 font-semibold">0</span> : p.stock) },
    {
      key: 'status',
      header: 'Statut',
      render: (p) => <StatusBadge label={productStatusMap[p.status].label} tone={productStatusMap[p.status].tone} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => (
        <ActionsMenu
          items={[
            { label: 'Éditer', onClick: () => setModalMode(p) },
            { label: 'Dupliquer', onClick: () => duplicateProduct.mutate(p.id) },
            { label: 'Supprimer', danger: true, onClick: () => deleteProduct.mutate(p.id) },
          ]}
        />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Produits"
        subtitle={`${allData?.total ?? 0} produit${(allData?.total ?? 0) > 1 ? 's' : ''} · ${outOfStockCount} en rupture`}
        action={
          <Button icon={<Plus size={16} />} onClick={() => setModalMode('create')}>
            Ajouter un produit
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <FilterPills<StatusFilter>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Tous' },
            { value: 'online', label: 'En ligne' },
            { value: 'draft', label: 'Brouillon' },
            { value: 'out_of_stock', label: 'Rupture' },
          ]}
        />
        <div className="relative sm:ml-auto sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a1]" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setSearchParams(e.target.value ? { search: e.target.value } : {})
            }}
            placeholder="Rechercher..."
            aria-label="Rechercher un produit"
            className="w-full rounded-xl border border-[#e8e8e4] pl-9 pr-3 py-2 text-sm focus:border-[#1E90FF] focus:ring-2 focus:ring-[#1E90FF]/20 transition-colors"
          />
        </div>
      </div>

      <DataTable columns={columns} rows={products} rowKey={(p) => p.id} isLoading={isLoading} emptyMessage="Aucun produit ne correspond à ces filtres." />

      {modalMode && (
        <ProductFormModal
          product={modalMode === 'create' ? undefined : modalMode}
          onClose={closeModal}
          onSubmit={handleSubmit}
          isSubmitting={createProduct.isPending || updateProduct.isPending}
        />
      )}
    </div>
  )
}
