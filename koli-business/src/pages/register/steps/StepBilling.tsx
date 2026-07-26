import { useEffect, useState } from 'react'
import { RadioGroup, StepHeader } from '../../../components/FormFields'
import { getSubscriptionPlans, type SubscriptionPlan } from '../../../lib/api'
import type { BillingMode, StepProps } from '../types'

export function StepBilling({ data, update }: StepProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)

  useEffect(() => {
    if (data.billingMode !== 'subscription' || plans.length > 0) return
    setLoadingPlans(true)
    getSubscriptionPlans()
      .then(all => setPlans(all.filter(p => p.is_active)))
      .catch(() => setPlans([]))
      .finally(() => setLoadingPlans(false))
  }, [data.billingMode, plans.length])

  return (
    <div className="flex flex-col gap-5">
      <StepHeader
        title="Votre modèle économique"
        desc="Choisissez comment vous serez facturé — modifiable plus tard depuis votre espace marchand (délai de 30 jours entre deux changements)."
      />

      <RadioGroup
        label="Modèle économique"
        name="billingMode"
        options={[
          { value: 'commission', label: 'Commission', desc: "Aucun abonnement — Skignas prélève un pourcentage sur chaque vente." },
          { value: 'subscription', label: 'Abonnement', desc: 'Un forfait mensuel ou annuel, avec une commission réduite selon le plan.' },
        ]}
        value={data.billingMode}
        onChange={v => update({ billingMode: v as BillingMode })}
      />

      {data.billingMode === 'subscription' && (
        <div className="border-t border-[#ebebeb] pt-5 flex flex-col gap-2.5">
          <span className="text-[13px] font-bold text-[#111] uppercase tracking-wide">Choisir un plan</span>
          {loadingPlans && <p className="text-[13px] text-[#6f6f6f]">Chargement des plans…</p>}
          {!loadingPlans && plans.length === 0 && (
            <p className="text-[13px] text-[#6f6f6f]">Aucun plan disponible pour le moment.</p>
          )}
          {plans.map(plan => (
            <label
              key={plan.id}
              className={`flex items-center justify-between gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${
                data.subscriptionPlanId === plan.id ? 'border-[#111] bg-[#f7f7f5]' : 'border-[#d6d6d6] hover:border-[#9a9a9a]'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="subscriptionPlanId"
                  checked={data.subscriptionPlanId === plan.id}
                  onChange={() => update({ subscriptionPlanId: plan.id })}
                  className="mt-0.5 w-4 h-4 accent-[#111] shrink-0"
                />
                <div className="flex flex-col">
                  <span className="text-[14px] font-semibold text-[#111]">{plan.name}</span>
                  <span className="text-[13px] text-[#6f6f6f]">Commission {plan.commission_rate}%</span>
                </div>
              </div>
              <span className="text-[14px] font-bold text-[#111] shrink-0">
                {plan.price_monthly === 0 ? 'Sur devis' : `${plan.price_monthly.toLocaleString('fr-FR')} FCFA/mois`}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
