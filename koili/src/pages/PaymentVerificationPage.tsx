import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { verifyOrderPayment } from '../lib/api'

const MAX_ATTEMPTS = 6
const RETRY_DELAY_MS = 1500

/**
 * Page neutre de retour WiniPayer — returnUrl ET cancelUrl y renvoient
 * toutes les deux (voir backend/src/routes/orders.ts, création de commande).
 * Le résultat n'est JAMAIS déduit de l'URL de redirection : cette page
 * demande systématiquement au backend de revérifier en direct auprès de
 * WiniPayer, puis redirige vers la page d'issue correspondante une fois le
 * statut réellement confirmé — jamais avant.
 */
export default function PaymentVerificationPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(0)
  const [stuck, setStuck] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    return () => { cancelledRef.current = true }
  }, [])

  useEffect(() => {
    if (!orderNumber) return

    verifyOrderPayment(orderNumber, token)
      .then(res => {
        if (cancelledRef.current) return
        const order = res.data

        if (order.paymentStatus === 'paid') {
          navigate(`/paiement/succes/${order.orderNumber}`, { replace: true })
          return
        }
        if (order.status === 'cancelled') {
          const dest = order.paymentFailureReason === 'failed' ? 'echec' : 'annule'
          navigate(`/paiement/${dest}/${order.orderNumber}`, { replace: true })
          return
        }

        // Statut encore incertain (webhook pas encore arrivé) — réessaie
        // après un court délai plutôt que d'afficher un résultat prématuré.
        if (attempt < MAX_ATTEMPTS) {
          setTimeout(() => { if (!cancelledRef.current) setAttempt(a => a + 1) }, RETRY_DELAY_MS)
        } else {
          setStuck(true)
        }
      })
      .catch(() => { if (!cancelledRef.current) setError('Impossible de vérifier votre paiement pour le moment.') })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, orderNumber])

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="max-w-sm w-full text-center flex flex-col items-center gap-5">

        {error ? (
          <>
            <AlertCircle size={32} className="text-gray-300" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Vérification impossible</h1>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{error}</p>
            </div>
            <button onClick={() => { setError(null); setAttempt(a => a + 1) }}
              className="text-sm font-semibold text-gray-900 underline underline-offset-4">
              Réessayer
            </button>
          </>
        ) : stuck ? (
          <>
            <AlertCircle size={32} className="text-gray-300" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">La vérification prend plus de temps que prévu</h1>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                Votre paiement est en cours de traitement. Vous pouvez suivre l'état de votre commande.
              </p>
            </div>
            <button onClick={() => navigate(`/commandes/${orderNumber}`, { replace: true })}
              className="text-sm font-semibold text-gray-900 underline underline-offset-4">
              Voir ma commande
            </button>
          </>
        ) : (
          <>
            <Loader2 size={32} className="animate-spin text-gray-400" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Vérification de votre paiement…</h1>
              <p className="text-sm text-gray-500 mt-1.5">Merci de patienter un instant.</p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
