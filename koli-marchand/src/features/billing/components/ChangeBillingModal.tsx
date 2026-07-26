import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { fmtFcfa } from '@/lib/format'
import type { BillingMode, MerchantgoError, SubscriptionPlan } from '@/lib/merchantgo'

interface ChangeBillingModalProps {
  plans: SubscriptionPlan[]
  currentMode: BillingMode
  currentPlanId?: string
  onClose: () => void
  isSubmitting: boolean
  error: MerchantgoError | null
  onSubmit: (input: { mode: BillingMode; subscriptionPlanId?: string }) => void
}

// La commission en mode "commission" reste fixée par Skignas (taux par
// défaut côté merchantgo) — jamais un champ libre ici, un marchand ne doit
// pas pouvoir choisir son propre taux.
export function ChangeBillingModal({ plans, currentMode, currentPlanId, onClose, isSubmitting, error, onSubmit }: ChangeBillingModalProps) {
  const [mode, setMode] = useState<BillingMode>(currentMode)
  const [planId, setPlanId] = useState<string | undefined>(currentPlanId)

  const activePlans = plans.filter((p) => p.is_active)

  return (
    <Modal title="Changer de modèle économique" onClose={onClose} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-[#6b6b68]">
          Ce choix est verrouillé 30 jours après chaque changement. Sélectionnez le modèle qui correspond le mieux à votre activité.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode('commission')}
            className={`text-left rounded-xl border p-4 transition-colors ${
              mode === 'commission' ? 'border-[#1E90FF] ring-2 ring-[#1E90FF]/20' : 'border-[#e8e8e4] hover:border-[#1E90FF]/40'
            }`}
          >
            <p className="font-bold text-[#0a0a0b]">Commission</p>
            <p className="text-xs text-[#6b6b68] mt-1">Aucun abonnement — Skignas prélève un pourcentage sur chaque vente.</p>
          </button>
          <button
            type="button"
            onClick={() => setMode('subscription')}
            className={`text-left rounded-xl border p-4 transition-colors ${
              mode === 'subscription' ? 'border-[#1E90FF] ring-2 ring-[#1E90FF]/20' : 'border-[#e8e8e4] hover:border-[#1E90FF]/40'
            }`}
          >
            <p className="font-bold text-[#0a0a0b]">Abonnement</p>
            <p className="text-xs text-[#6b6b68] mt-1">Un forfait mensuel ou annuel, avec une commission réduite selon le plan.</p>
          </button>
        </div>

        {mode === 'subscription' && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#0a0a0b] uppercase tracking-wider">Choisir un plan</p>
            {activePlans.length === 0 && <p className="text-sm text-[#6b6b68]">Aucun plan disponible pour le moment.</p>}
            {activePlans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setPlanId(plan.id)}
                className={`w-full text-left rounded-xl border p-3.5 flex items-center justify-between transition-colors ${
                  planId === plan.id ? 'border-[#1E90FF] ring-2 ring-[#1E90FF]/20' : 'border-[#e8e8e4] hover:border-[#1E90FF]/40'
                }`}
              >
                <div>
                  <p className="font-semibold text-[#0a0a0b] text-sm">{plan.name}</p>
                  <p className="text-xs text-[#6b6b68] mt-0.5">Commission {plan.commission_rate.toFixed(1)}%</p>
                </div>
                <p className="font-bold text-[#0a0a0b] text-sm">{plan.price_monthly === 0 ? 'Sur devis' : `${fmtFcfa(plan.price_monthly)}/mois`}</p>
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-rose-600">{error.message}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            isLoading={isSubmitting}
            disabled={mode === 'subscription' && !planId}
            onClick={() => onSubmit(mode === 'subscription' ? { mode, subscriptionPlanId: planId } : { mode })}
          >
            Confirmer
          </Button>
        </div>
      </div>
    </Modal>
  )
}
