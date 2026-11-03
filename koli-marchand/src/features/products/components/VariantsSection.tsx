import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/FormField'
import { useVariants, useCreateVariant, useUpdateVariant, useDeleteVariant } from '../api/useVariants'

export function VariantsSection({ productId }: { productId: string }) {
  const { data: variants, isLoading } = useVariants(productId)
  const createVariant = useCreateVariant(productId)
  const updateVariant = useUpdateVariant(productId)
  const deleteVariant = useDeleteVariant(productId)

  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')

  const handleAdd = () => {
    if (!name || !price) return
    createVariant.mutate(
      { name, price: Number(price), stock: Number(stock || 0), isActive: true },
      { onSuccess: () => { setShowAdd(false); setName(''); setPrice(''); setStock('') } },
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-[#0a0a0b]">Variantes</label>
        <Button type="button" variant="secondary" icon={<Plus size={12} />} onClick={() => setShowAdd(s => !s)}>
          Ajouter une variante
        </Button>
      </div>
      <p className="text-xs text-[#6b6b68] mb-2">
        Ex : "L / Rouge", "256 Go", "42" — chaque variante a son propre prix et stock, vendus séparément du produit.
      </p>

      {showAdd && (
        <div className="mb-3 p-3 rounded-xl border border-[#e8e8e4] bg-[#fafaf8] grid grid-cols-1 sm:grid-cols-[1fr_120px_100px_auto] gap-2 items-end">
          <TextField label="Nom" id="variant-name" value={name} onChange={e => setName(e.target.value)} placeholder="L / Rouge" />
          <TextField label="Prix (FCFA)" id="variant-price" type="number" min={0} value={price} onChange={e => setPrice(e.target.value)} placeholder="15000" />
          <TextField label="Stock" id="variant-stock" type="number" min={0} value={stock} onChange={e => setStock(e.target.value)} placeholder="10" />
          <Button type="button" onClick={handleAdd} isLoading={createVariant.isPending} disabled={!name || !price}>
            Ajouter
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-[#6b6b68] flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Chargement…</p>
      ) : !variants || variants.length === 0 ? (
        <p className="text-xs text-[#a3a3a1]">Aucune variante — ce produit se vend avec le prix et le stock ci-dessus.</p>
      ) : (
        <div className="divide-y divide-[#e8e8e4] border border-[#e8e8e4] rounded-xl">
          {variants.map(v => (
            <div key={v.id} className="flex items-center gap-2 px-3 py-2">
              <span className="flex-1 text-sm text-[#0a0a0b] truncate">{v.name}</span>
              <input
                type="number" min={0} defaultValue={v.price}
                onBlur={e => {
                  const price = Number(e.target.value)
                  if (price !== v.price && price >= 0) updateVariant.mutate({ id: v.id, price })
                }}
                className="w-24 rounded-lg border border-[#e8e8e4] px-2 py-1 text-xs text-right focus:border-[#1E90FF] focus:outline-none"
              />
              <input
                type="number" min={0} defaultValue={v.stock}
                onBlur={e => {
                  const stock = Number(e.target.value)
                  if (stock !== v.stock && stock >= 0) updateVariant.mutate({ id: v.id, stock })
                }}
                className="w-20 rounded-lg border border-[#e8e8e4] px-2 py-1 text-xs text-right focus:border-[#1E90FF] focus:outline-none"
              />
              <label className="flex items-center gap-1 text-[11px] text-[#6b6b68] cursor-pointer shrink-0">
                <input type="checkbox" checked={v.isActive}
                  onChange={e => updateVariant.mutate({ id: v.id, isActive: e.target.checked })}
                  className="w-3.5 h-3.5 rounded accent-[#1E90FF]" />
                Active
              </label>
              <button
                type="button"
                onClick={() => { if (confirm(`Supprimer la variante "${v.name}" ?`)) deleteVariant.mutate(v.id) }}
                className="p-1 text-rose-500 hover:text-rose-700 transition-colors"
                aria-label={`Supprimer ${v.name}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
