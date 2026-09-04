import { useState } from 'react'
import { Smartphone, CreditCard, FlaskConical, CheckCircle2 } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { formatMoney } from '../../lib/money'
import type { Currency } from '../../types'

type Method = 'wave' | 'orange_money' | 'mtn_money' | 'card'

const METHODS: { id: Method; label: string; icon: React.ReactNode }[] = [
  { id: 'wave', label: 'Wave', icon: <Smartphone size={18} /> },
  { id: 'orange_money', label: 'Orange Money', icon: <Smartphone size={18} /> },
  { id: 'mtn_money', label: 'MTN Mobile Money', icon: <Smartphone size={18} /> },
  { id: 'card', label: 'Carte bancaire', icon: <CreditCard size={18} /> },
]

export function DemoPaymentModal({
  open,
  onClose,
  amount,
  currency,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  amount: number
  currency: Currency
  onConfirm: (method: Method) => Promise<void>
}) {
  const [method, setMethod] = useState<Method | null>(null)
  const [step, setStep] = useState<'choose' | 'processing' | 'done'>('choose')

  async function confirm() {
    if (!method) return
    setStep('processing')
    await new Promise((r) => setTimeout(r, 900)) // simule le temps d'un vrai checkout, pour un flux crédible
    await onConfirm(method)
    setStep('done')
  }

  function handleClose() {
    onClose()
    setTimeout(() => {
      setStep('choose')
      setMethod(null)
    }, 300)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Payer en ligne">
      <div className="mb-4 flex items-center gap-2 border border-amber-200 bg-amber-50 px-3 py-2.5">
        <FlaskConical size={15} className="shrink-0 text-amber-600" />
        <p className="text-xs font-semibold text-amber-800">
          Mode démonstration — aucun paiement réel ne sera effectué, aucune connexion à Wave, Orange Money, MTN ou une banque n'a lieu.
        </p>
      </div>

      {step === 'choose' && (
        <div className="flex flex-col gap-3">
          <div className="bg-gray-50 px-4 py-3 text-center">
            <p className="text-xs text-muted">Montant à payer</p>
            <p className="text-xl font-extrabold text-ink">{formatMoney(amount, currency)}</p>
          </div>

          <p className="text-xs font-semibold text-muted">Choisissez un moyen de paiement (démo)</p>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`flex items-center gap-2.5 border px-3 py-3 text-sm font-medium transition-colors ${
                  method === m.id ? 'border-brand bg-brand-light text-brand-dark' : 'border-border text-ink hover:bg-gray-50'
                }`}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          <Button className="mt-2" disabled={!method} onClick={confirm}>
            Confirmer le paiement (démo)
          </Button>
        </div>
      )}

      {step === 'processing' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="h-8 w-8 animate-spin border-2 border-brand border-t-transparent" />
          <p className="text-sm text-muted">Simulation du paiement en cours…</p>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <p className="text-sm font-bold text-ink">Paiement simulé avec succès (démo)</p>
          <p className="text-xs text-muted">Aucun fonds réel n'a été transféré.</p>
          <Button variant="secondary" onClick={handleClose} className="mt-2">
            Fermer
          </Button>
        </div>
      )}
    </Modal>
  )
}
