import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PiggyBank } from 'lucide-react'
import { api, fmtDateTime } from '../../lib/api'
import { formatFCFA } from '../../lib/format'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

/* Valeurs calculées par l'API (backend/src/lib/finance) — aucune formule ici. */
type OrderFinance = {
  paidAt: string | null
  snapshotAt: string | null
  costKnown: boolean
  shippingFeeCharged: number
  shippingActualCost: number | null
  shippingResult: number | null
  margin: number | null
  lines: { orderItemId: number; name: string; supplierMode: 'MARGIN' | 'COMMISSION'; quantity: number; margin: number | null; commissionAmount: number }[]
}

/** Encart « Rentabilité » du détail commande : marge figée au paiement + coût réel de livraison. */
export function OrderFinanceCard({ orderId }: { orderId: string }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['order-finance', orderId],
    queryFn: async () => (await api.get(`/api/admin/finance/orders/${orderId}`)).data.data as OrderFinance,
  })
  const [draft, setDraft] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: (value: number | null) => api.put(`/api/admin/finance/orders/${orderId}/shipping-cost`, { shippingActualCost: value }),
    onSuccess: () => { setDraft(null); qc.invalidateQueries({ queryKey: ['order-finance', orderId] }) },
  })
  if (!data) return null

  const value = draft ?? (data.shippingActualCost != null ? String(data.shippingActualCost) : '')
  const valid = value === '' || /^\d+$/.test(value)
  const row = 'flex justify-between gap-3'

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <PiggyBank size={14} className="text-slate-400" /> Rentabilité
      </h3>
      <div className="space-y-2 text-sm">
        {!data.snapshotAt ? (
          <p className="text-slate-500">Marge figée au paiement : la commande n'est pas encore payée.</p>
        ) : data.costKnown && data.margin != null ? (
          <>
            <div className={row}><span className="text-slate-500">Marge brute HT</span><span className={data.margin < 0 ? 'text-red-600 font-medium' : 'text-slate-900 font-medium'}>{formatFCFA(data.margin)}</span></div>
            <p className="text-xs text-slate-400">Figée le {fmtDateTime(data.snapshotAt)}, avant retours éventuels.</p>
          </>
        ) : (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Coût fournisseur inconnu : commande exclue des calculs de marge (reste comptée dans le CA).
          </p>
        )}

        <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
          <div className={row}><span className="text-slate-500">Livraison facturée</span><span className="text-slate-900">{formatFCFA(data.shippingFeeCharged)}</span></div>
          <form className="flex items-end gap-2" onSubmit={e => { e.preventDefault(); if (valid) save.mutate(value === '' ? null : Number(value)) }}>
            <label className="flex-1 flex flex-col gap-1 text-xs text-slate-500">Coût réel de livraison (F CFA)
              <input inputMode="numeric" value={value} onChange={e => setDraft(e.target.value.trim())} placeholder="Inconnu"
                aria-invalid={!valid || undefined}
                className="h-9 px-3 rounded-input border border-line bg-card text-sm text-ink" />
            </label>
            <Button type="submit" size="sm" variant="secondary" loading={save.isPending} disabled={!valid || draft === null}>Enregistrer</Button>
          </form>
          {!valid && <p className="text-xs text-red-600">Montant entier en F CFA attendu.</p>}
          {save.isError && <p className="text-xs text-red-600">Échec de l'enregistrement.</p>}
          {data.shippingResult != null && (
            <div className={row}><span className="text-slate-500">Résultat livraison</span><span className={data.shippingResult < 0 ? 'text-red-600' : 'text-slate-900'}>{formatFCFA(data.shippingResult)}</span></div>
          )}
        </div>
      </div>
    </Card>
  )
}
