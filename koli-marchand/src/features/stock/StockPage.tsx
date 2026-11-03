import { useState } from 'react'
import { AlertTriangle, Package } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { TextField } from '@/components/ui/FormField'
import { fmtFcfa } from '@/lib/format'
import { useProducts } from '@/features/products/api/useProducts'
import { useLowStockThreshold, useUpdateLowStockThreshold } from './api/useLowStockThreshold'
import type { Product } from '@/types'

export default function StockPage() {
  const { data, isLoading } = useProducts({ status: 'all', search: '' })
  const { data: threshold } = useLowStockThreshold()
  const updateThreshold = useUpdateLowStockThreshold()
  const [thresholdInput, setThresholdInput] = useState<string>('')
  const [editingThreshold, setEditingThreshold] = useState(false)

  const products = data?.items ?? []
  const effectiveThreshold = threshold ?? null
  const lowStockProducts = effectiveThreshold != null
    ? products.filter(p => p.stock <= effectiveThreshold && p.stock > 0)
    : []
  const outOfStock = products.filter(p => p.stock === 0)

  const saveThreshold = () => {
    const n = thresholdInput === '' ? null : Number(thresholdInput)
    updateThreshold.mutate(n, { onSuccess: () => setEditingThreshold(false) })
  }

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'name', header: 'Produit',
      render: (p) => (
        <div className="flex items-center gap-3">
          {p.images[0] && <img src={p.images[0].thumbnailUrl || p.images[0].url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />}
          <span className="font-medium text-[#0a0a0b] truncate">{p.name}</span>
        </div>
      ),
    },
    { key: 'price', header: 'Prix', align: 'right', render: (p) => fmtFcfa(p.price) },
    {
      key: 'stock', header: 'Stock', align: 'right',
      render: (p) => (
        <span className={p.stock === 0 ? 'text-rose-600 font-semibold' : effectiveThreshold != null && p.stock <= effectiveThreshold ? 'text-amber-600 font-semibold' : 'text-[#0a0a0b]'}>
          {p.stock}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Stock" subtitle="Niveaux de stock et alertes de rupture" />

      <Card className="p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-[#0a0a0b] text-sm">Seuil d'alerte de stock bas</h2>
            <p className="text-xs text-[#6b6b68] mt-1 max-w-md">
              En dessous de ce seuil, vous recevez un e-mail pour chaque produit ou variante concerné.
              Laissez vide pour désactiver les alertes.
            </p>
          </div>
          {!editingThreshold ? (
            <Button variant="secondary" onClick={() => { setThresholdInput(effectiveThreshold?.toString() ?? ''); setEditingThreshold(true) }}>
              {effectiveThreshold != null ? `Seuil : ${effectiveThreshold}` : 'Régler un seuil'}
            </Button>
          ) : (
            <div className="flex items-end gap-2">
              <TextField label="Seuil" id="threshold" type="number" min={0} value={thresholdInput}
                onChange={e => setThresholdInput(e.target.value)} placeholder="5" className="w-24" />
              <Button onClick={saveThreshold} isLoading={updateThreshold.isPending}>Enregistrer</Button>
              <Button variant="secondary" onClick={() => setEditingThreshold(false)}>Annuler</Button>
            </div>
          )}
        </div>
      </Card>

      {(lowStockProducts.length > 0 || outOfStock.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {outOfStock.length > 0 && (
            <Card className="p-4 flex items-center gap-3 border-rose-200 bg-rose-50">
              <AlertTriangle size={18} className="text-rose-600 shrink-0" />
              <p className="text-sm text-rose-700"><strong>{outOfStock.length}</strong> produit{outOfStock.length > 1 ? 's' : ''} en rupture de stock</p>
            </Card>
          )}
          {lowStockProducts.length > 0 && (
            <Card className="p-4 flex items-center gap-3 border-amber-200 bg-amber-50">
              <Package size={18} className="text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700"><strong>{lowStockProducts.length}</strong> produit{lowStockProducts.length > 1 ? 's' : ''} sous le seuil d'alerte</p>
            </Card>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={[...products].sort((a, b) => a.stock - b.stock)}
        rowKey={(p) => p.id}
        isLoading={isLoading}
        emptyMessage="Aucun produit."
      />
    </div>
  )
}
