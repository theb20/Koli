import { useState } from 'react'
import { Loader2, MapPin, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SelectField, TextField } from '@/components/ui/FormField'
import {
  ABIDJAN_COMMUNES, UPCOUNTRY_ZONE_NAME,
  useDeliveryZones, useCreateDeliveryZone, useUpdateDeliveryZone, useDeleteDeliveryZone,
} from './api/useDeliveryZones'

const ALL_ZONE_NAMES = [...ABIDJAN_COMMUNES, UPCOUNTRY_ZONE_NAME]

export default function DeliveryZonesTab() {
  const { data: zones, isLoading } = useDeliveryZones()
  const createZone = useCreateDeliveryZone()
  const updateZone = useUpdateDeliveryZone()
  const deleteZone = useDeleteDeliveryZone()

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newCod, setNewCod] = useState(true)

  const usedNames = new Set((zones ?? []).map(z => z.name))
  const availableNames = ALL_ZONE_NAMES.filter(n => !usedNames.has(n))

  const handleAdd = () => {
    if (!newName || !newPrice) return
    createZone.mutate(
      { name: newName, price: Number(newPrice), codAllowed: newCod, isActive: true },
      { onSuccess: () => { setShowAdd(false); setNewName(''); setNewPrice(''); setNewCod(true) } },
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h2 className="font-bold text-[#0a0a0b]">Zones de livraison</h2>
          <p className="text-xs text-[#6b6b68] mt-1 max-w-xl">
            Un tarif par commune d'Abidjan, plus une zone unique pour le reste du pays. Une zone sans
            paiement à la livraison n'autorisera que le paiement en ligne pour vos clients de cette zone.
            Les communes non configurées gardent le tarif plateforme par défaut.
          </p>
        </div>
        {availableNames.length > 0 && (
          <Button variant="secondary" icon={<Plus size={14} />} onClick={() => setShowAdd(s => !s)}>
            Ajouter une zone
          </Button>
        )}
      </div>

      {showAdd && (
        <div className="mt-4 p-4 rounded-xl border border-[#e8e8e4] bg-[#fafaf8] grid grid-cols-1 sm:grid-cols-[1fr_140px_auto_auto] gap-3 items-end">
          <SelectField
            label="Zone" id="new-zone-name" value={newName} onChange={e => setNewName(e.target.value)}
            options={[{ value: '', label: 'Choisir…' }, ...availableNames.map(n => ({ value: n, label: n }))]}
          />
          <TextField
            label="Tarif (F CFA)" id="new-zone-price" type="number" min={0} step={100}
            value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="1500"
          />
          <label className="flex items-center gap-2 text-xs font-medium text-[#0a0a0b] pb-2.5 cursor-pointer">
            <input type="checkbox" checked={newCod} onChange={e => setNewCod(e.target.checked)}
              className="w-4 h-4 rounded accent-[#1E90FF]" />
            Paiement à la livraison
          </label>
          <Button onClick={handleAdd} isLoading={createZone.isPending} disabled={!newName || !newPrice}>
            Ajouter
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-[#6b6b68] mt-6 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Chargement…</p>
      ) : !zones || zones.length === 0 ? (
        <div className="mt-6 py-10 flex flex-col items-center gap-2 text-center">
          <MapPin size={22} className="text-[#a3a3a1]" />
          <p className="text-sm text-[#6b6b68]">Aucune zone configurée — tous vos clients paient le tarif plateforme par défaut.</p>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-[#e8e8e4]">
          {zones.map(zone => (
            <div key={zone.id} className="flex items-center gap-3 py-3">
              <span className="flex-1 text-sm font-medium text-[#0a0a0b]">{zone.name}</span>

              <div className="flex items-center gap-1">
                <input
                  type="number" min={0} step={100} defaultValue={zone.price}
                  onBlur={e => {
                    const price = Number(e.target.value)
                    if (price !== zone.price && price >= 0) updateZone.mutate({ id: zone.id, price })
                  }}
                  className="w-24 rounded-lg border border-[#e8e8e4] px-2 py-1.5 text-sm text-right focus:border-[#1E90FF] focus:outline-none"
                />
                <span className="text-xs text-[#6b6b68]">F CFA</span>
              </div>

              <label className="flex items-center gap-1.5 text-xs text-[#6b6b68] cursor-pointer w-36 shrink-0">
                <input
                  type="checkbox" checked={zone.codAllowed}
                  onChange={e => updateZone.mutate({ id: zone.id, codAllowed: e.target.checked })}
                  className="w-4 h-4 rounded accent-[#1E90FF]"
                />
                Paiement livraison
              </label>

              <label className="flex items-center gap-1.5 text-xs text-[#6b6b68] cursor-pointer w-24 shrink-0">
                <input
                  type="checkbox" checked={zone.isActive}
                  onChange={e => updateZone.mutate({ id: zone.id, isActive: e.target.checked })}
                  className="w-4 h-4 rounded accent-[#1E90FF]"
                />
                Active
              </label>

              <button
                onClick={() => { if (confirm(`Supprimer la zone "${zone.name}" ?`)) deleteZone.mutate(zone.id) }}
                className="p-1.5 text-rose-500 hover:text-rose-700 transition-colors"
                aria-label={`Supprimer la zone ${zone.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
