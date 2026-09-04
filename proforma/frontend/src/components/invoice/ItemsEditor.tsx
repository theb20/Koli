import { Plus, Trash2 } from '../ui/Icon'
import { fromMinorUnits } from '../../lib/money'
import type { Currency, Product, Tax } from '../../types'

export interface EditorItem {
  productId?: string | null
  reference?: string
  name: string
  description?: string
  quantity: number
  unit: string
  unitPrice: number // unité majeure
  discountPercent: number
  taxId?: string | null
  taxRate: number
}

export function emptyItem(defaultTax?: Tax): EditorItem {
  return {
    name: '',
    quantity: 1,
    unit: 'unité',
    unitPrice: 0,
    discountPercent: 0,
    taxId: defaultTax?.id || null,
    taxRate: defaultTax?.rate || 0,
  }
}

export function ItemsEditor({
  items,
  onChange,
  products,
  taxes,
  currency,
}: {
  items: EditorItem[]
  onChange: (items: EditorItem[]) => void
  products: Product[]
  taxes: Tax[]
  currency: Currency
}) {
  function update(index: number, patch: Partial<EditorItem>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  function add() {
    const defaultTax = taxes.find((t) => t.isDefault)
    onChange([...items, emptyItem(defaultTax)])
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="border border-border bg-white p-3">
          <div className="mb-2 flex items-center gap-2">
            {products.length > 0 && (
              <select
                className="h-8 flex-1 border border-border bg-gray-50 px-2 text-xs"
                value={item.productId || ''}
                onChange={(e) => {
                  if (!e.target.value) return
                  const product = products.find((p) => p.id === e.target.value)
                  if (!product) return
                  update(i, {
                    productId: product.id,
                    reference: product.reference || undefined,
                    name: product.name,
                    description: product.description || undefined,
                    unit: product.unit,
                    unitPrice: fromMinorUnits(product.unitPrice, currency),
                    taxId: product.defaultTaxId || item.taxId,
                    taxRate: product.defaultTax?.rate ?? item.taxRate,
                  })
                }}
              >
                <option value="">Produit du catalogue (optionnel)…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <button onClick={() => remove(i)} className="ml-auto p-1.5 text-muted hover:bg-red-50 hover:text-danger">
              <Trash2 size={14} />
            </button>
          </div>

          <div className="grid grid-cols-12 gap-2">
            <input
              placeholder="Référence"
              value={item.reference || ''}
              onChange={(e) => update(i, { reference: e.target.value })}
              className="col-span-2 h-9 border border-border px-2 text-xs"
            />
            <input
              placeholder="Désignation"
              value={item.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className="col-span-4 h-9 border border-border px-2 text-xs font-medium"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Qté"
              value={item.quantity}
              onChange={(e) => update(i, { quantity: Number(e.target.value) })}
              className="col-span-1 h-9 border border-border px-2 text-xs"
            />
            <input
              placeholder="Unité"
              value={item.unit}
              onChange={(e) => update(i, { unit: e.target.value })}
              className="col-span-1 h-9 border border-border px-2 text-xs"
            />
            <input
              type="number"
              min={0}
              placeholder="Prix unitaire"
              value={item.unitPrice}
              onChange={(e) => update(i, { unitPrice: Number(e.target.value) })}
              className="col-span-2 h-9 border border-border px-2 text-xs text-right"
            />
            <input
              type="number"
              min={0}
              max={100}
              placeholder="Remise %"
              value={item.discountPercent}
              onChange={(e) => update(i, { discountPercent: Number(e.target.value) })}
              className="col-span-1 h-9 border border-border px-2 text-xs text-right"
            />
            <select
              value={item.taxId || ''}
              onChange={(e) => {
                const tax = taxes.find((t) => t.id === e.target.value)
                update(i, { taxId: tax?.id || null, taxRate: tax?.rate ?? 0 })
              }}
              className="col-span-1 h-9 border border-border px-1 text-xs"
            >
              <option value="">0%</option>
              {taxes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.rate}%
                </option>
              ))}
            </select>
          </div>
          <input
            placeholder="Description (optionnel)"
            value={item.description || ''}
            onChange={(e) => update(i, { description: e.target.value })}
            className="mt-2 h-8 w-full border border-border px-2 text-xs text-muted"
          />
        </div>
      ))}

      <button onClick={add} className="flex items-center justify-center gap-1.5 border border-dashed border-border py-2.5 text-xs font-semibold text-brand hover:bg-brand-light">
        <Plus size={14} /> Ajouter une ligne
      </button>
    </div>
  )
}
