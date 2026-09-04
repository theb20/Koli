import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Input, Select, Textarea } from '../ui/Field'
import { Button } from '../ui/Button'
import { api } from '../../lib/api'
import { useUiStore } from '../../store/uiStore'
import type { Product, Tax } from '../../types'

const EMPTY = {
  reference: '',
  name: '',
  description: '',
  category: '',
  unitPrice: 0,
  unit: 'unité',
  defaultTaxId: '',
  trackStock: false,
  stockQuantity: 0,
  lowStockThreshold: 0,
}

export function ProductFormModal({
  open,
  onClose,
  product,
  companyId,
  taxes,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  product?: Product
  companyId: string
  taxes: Tax[]
  onSaved: () => void
}) {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pushToast = useUiStore((s) => s.pushToast)

  useEffect(() => {
    if (open) {
      setForm(
        product
          ? {
              reference: product.reference || '',
              name: product.name,
              description: product.description || '',
              category: product.category || '',
              unitPrice: product.unitPrice,
              unit: product.unit,
              defaultTaxId: product.defaultTaxId || '',
              trackStock: product.trackStock,
              stockQuantity: product.stockQuantity,
              lowStockThreshold: product.lowStockThreshold,
            }
          : EMPTY
      )
      setError('')
    }
  }, [open, product])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Le nom est requis')
    setLoading(true)
    setError('')
    const payload = { ...form, defaultTaxId: form.defaultTaxId || null, currency: 'XOF' }
    try {
      if (product) {
        await api.put(`/api/products/${product.id}`, payload)
        pushToast('Produit mis à jour', 'success')
      } else {
        await api.post(`/api/companies/${companyId}/products`, payload)
        pushToast('Produit créé', 'success')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={product ? 'Modifier le produit' : 'Nouveau produit'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-3">
          <Input label="Référence" className="col-span-1" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          <Input label="Nom" required className="col-span-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Input label="Catégorie" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Prix unitaire (FCFA)" type="number" min={0} className="col-span-2" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} />
          <Input label="Unité" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        </div>
        <Select label="Taxe par défaut" value={form.defaultTaxId} onChange={(e) => setForm({ ...form, defaultTaxId: e.target.value })}>
          <option value="">Aucune</option>
          {taxes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} {t.rate}%
            </option>
          ))}
        </Select>

        <label className="flex items-center gap-2 border border-border bg-gray-50 px-3 py-2.5">
          <input type="checkbox" checked={form.trackStock} onChange={(e) => setForm({ ...form, trackStock: e.target.checked })} />
          <span className="text-sm font-medium text-ink">Suivre le stock (produit physique)</span>
        </label>

        {form.trackStock && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantité en stock"
              type="number"
              min={0}
              value={form.stockQuantity}
              onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })}
            />
            <Input
              label="Seuil d'alerte rupture"
              type="number"
              min={0}
              value={form.lowStockThreshold}
              onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })}
            />
          </div>
        )}

        {error && <p className="text-xs font-medium text-danger">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            {product ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
