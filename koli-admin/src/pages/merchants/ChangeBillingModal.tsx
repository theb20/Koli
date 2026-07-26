import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { api, fmt } from '../../lib/api'

type SubscriptionPlan = {
  id: string
  name: string
  commission_rate: number
  price_monthly: number
  is_active: boolean
}

type BillingMode = 'commission' | 'subscription'

interface ChangeBillingModalProps {
  merchantId: number
  currentMode: BillingMode
  currentCommissionRate: number
  currentPlanId?: string
  onClose: () => void
}

export function ChangeBillingModal({ merchantId, currentMode, currentCommissionRate, currentPlanId, onClose }: ChangeBillingModalProps) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<BillingMode>(currentMode)
  const [commissionRate, setCommissionRate] = useState(currentCommissionRate)
  const [planId, setPlanId] = useState<string | undefined>(currentPlanId)

  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ['subscription-plans-admin'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/subscription-plans?all=true')
      // La route backend relaie tel quel le corps de merchantgo (déjà
      // enveloppé {success,data}) dans son propre {success,data}.
      return data.data.data as SubscriptionPlan[]
    },
  })
  const activePlans = (plans ?? []).filter((p) => p.is_active)

  const mutation = useMutation({
    mutationFn: () =>
      api.put(`/api/admin/sellers/${merchantId}/billing`, {
        mode,
        commissionRate: mode === 'commission' ? commissionRate : undefined,
        subscriptionPlanId: mode === 'subscription' ? planId : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sellers'] })
      onClose()
    },
  })

  const error = mutation.error as { response?: { data?: { message?: string } } } | null

  return (
    <Modal open onClose={onClose} title="Changer le modèle économique">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode('commission')}
            className={`text-left rounded-xl border p-3.5 transition-colors ${
              mode === 'commission' ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="text-sm font-semibold text-slate-900">Commission</p>
            <p className="text-xs text-slate-500 mt-0.5">Taux personnalisé, sans abonnement</p>
          </button>
          <button
            type="button"
            onClick={() => setMode('subscription')}
            className={`text-left rounded-xl border p-3.5 transition-colors ${
              mode === 'subscription' ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="text-sm font-semibold text-slate-900">Abonnement</p>
            <p className="text-xs text-slate-500 mt-0.5">Un plan avec commission incluse</p>
          </button>
        </div>

        {mode === 'commission' && (
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Taux de commission (%)</label>
            <input
              type="number" min={0} max={100} step={0.5}
              value={commissionRate}
              onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        )}

        {mode === 'subscription' && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Plan</p>
            {activePlans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setPlanId(plan.id)}
                className={`w-full text-left rounded-xl border p-3 flex items-center justify-between transition-colors ${
                  planId === plan.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
                  <p className="text-xs text-slate-500">Commission {plan.commission_rate}%</p>
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {plan.price_monthly === 0 ? 'Sur devis' : `${fmt(plan.price_monthly)}/mois`}
                </p>
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error.response?.data?.message ?? 'Erreur lors de la mise à jour.'}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
          <Button
            size="sm"
            loading={mutation.isPending}
            disabled={mode === 'subscription' && !planId}
            onClick={() => mutation.mutate()}
          >
            Confirmer
          </Button>
        </div>
      </div>
    </Modal>
  )
}
