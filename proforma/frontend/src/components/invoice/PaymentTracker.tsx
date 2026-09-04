import { useState } from 'react'
import { CheckCircle2, Wallet, Landmark } from '../ui/Icon'
import { formatMoney } from '../../lib/money'
import { Button } from '../ui/Button'
import type { Currency } from '../../types'

export function PaymentTracker({
  deposit,
  balanceDue,
  total,
  currency,
  paymentStatus,
  depositPaidAt,
  paidAt,
  paymentProvider,
  onMarkDeposit,
  onMarkPaid,
}: {
  deposit: number
  balanceDue: number
  total: number
  currency: Currency
  paymentStatus?: string | null
  depositPaidAt?: string | null
  paidAt?: string | null
  paymentProvider?: string | null
  onMarkDeposit: () => Promise<void>
  onMarkPaid: () => Promise<void>
}) {
  const [loading, setLoading] = useState<'deposit' | 'paid' | null>(null)
  const hasDeposit = deposit > 0
  const isPaid = paymentStatus === 'paid'
  const isDemo = paymentProvider?.startsWith('demo-')

  if (isPaid) {
    return (
      <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
        <CheckCircle2 size={16} />
        {isDemo ? 'Payée intégralement (démo)' : 'Payée intégralement'}
        {paidAt && <span className="font-normal text-emerald-600">— le {new Date(paidAt).toLocaleDateString('fr-FR')}</span>}
      </div>
    )
  }

  async function markDeposit() {
    setLoading('deposit')
    try {
      await onMarkDeposit()
    } finally {
      setLoading(null)
    }
  }

  async function markPaid() {
    setLoading('paid')
    try {
      await onMarkPaid()
    } finally {
      setLoading(null)
    }
  }

  if (!hasDeposit) {
    return (
      <div className="flex flex-wrap items-center gap-3 border border-border bg-white p-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">Paiement</p>
          <p className="text-xs text-muted">Aucun acompte défini — enregistrez le règlement dès que vous le recevez (espèces, virement, mobile money…).</p>
        </div>
        <Button icon={<CheckCircle2 size={15} />} loading={loading === 'paid'} onClick={markPaid}>
          Marquer payée ({formatMoney(total, currency)})
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 border border-border bg-white p-4">
      <p className="text-sm font-semibold text-ink">Paiement en deux temps (acompte défini)</p>

      <div className="flex flex-wrap items-center gap-3 border border-border bg-gray-50 px-3 py-2.5">
        <Wallet size={16} className={depositPaidAt ? 'text-emerald-600' : 'text-muted'} />
        <div className="flex-1">
          <p className="text-xs font-semibold text-ink">Acompte — {formatMoney(deposit, currency)}</p>
          {depositPaidAt ? (
            <p className="text-[11px] text-emerald-600">Reçu le {new Date(depositPaidAt).toLocaleDateString('fr-FR')}</p>
          ) : (
            <p className="text-[11px] text-muted">Pas encore enregistré</p>
          )}
        </div>
        {!depositPaidAt && (
          <Button size="sm" variant="secondary" loading={loading === 'deposit'} onClick={markDeposit}>
            Marquer reçu
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border border-border bg-gray-50 px-3 py-2.5">
        <Landmark size={16} className="text-muted" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-ink">Solde restant — {formatMoney(balanceDue, currency)}</p>
          <p className="text-[11px] text-muted">Marque le document intégralement payé</p>
        </div>
        <Button size="sm" loading={loading === 'paid'} onClick={markPaid}>
          Marquer le solde reçu
        </Button>
      </div>
    </div>
  )
}
