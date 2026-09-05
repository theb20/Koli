import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { fetchOrder, type ApiOrder } from '../../lib/api'
import { PaymentOutcomeCard, type PaymentOutcome } from './PaymentOutcomeCard'

/**
 * Charge une commande par son numéro et affiche la carte d'issue de paiement
 * correspondante — fonctionne aussi bien juste après redirection depuis
 * PaymentVerificationPage (qui vient de confirmer le statut) qu'après un
 * refresh direct sur l'URL (la commande est rechargée depuis le serveur,
 * jamais depuis un state de navigation qui pourrait être périmé ou absent).
 */
export function PaymentOutcomeStatusPage({ outcome }: { outcome: PaymentOutcome }) {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [order, setOrder] = useState<ApiOrder | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderNumber) return
    let cancelled = false
    fetchOrder(orderNumber, token)
      .then(res => { if (!cancelled) setOrder(res.data) })
      .catch(() => { if (!cancelled) setError('Commande introuvable.') })
    return () => { cancelled = true }
  }, [orderNumber, token])

  if (error) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle size={32} className="text-gray-300" />
        <p className="text-gray-500 text-sm">{error}</p>
        <button onClick={() => navigate('/', { replace: true })}
          className="text-sm font-semibold text-gray-900 underline underline-offset-4">
          Retour à l'accueil
        </button>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-gray-300" />
      </div>
    )
  }

  return <PaymentOutcomeCard outcome={outcome} order={order} />
}
