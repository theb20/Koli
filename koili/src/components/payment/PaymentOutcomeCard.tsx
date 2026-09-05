import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Ban, AlertTriangle, ShoppingBag, Home, ListOrdered } from 'lucide-react'
import { fmtPrice, type ApiOrder } from '../../lib/api'

export type PaymentOutcome = 'success' | 'cancelled' | 'failed'

const PAYMENT_LABELS: Record<string, string> = {
  online: 'WiniPayer',
  cash:   'Paiement à la livraison',
}

const OUTCOME_CONTENT: Record<PaymentOutcome, {
  icon: typeof CheckCircle2
  gradient: string
  glow: string
  title: string
  message: string
  statusLabel: string
  statusTone: string
}> = {
  success: {
    icon: CheckCircle2,
    gradient: 'from-emerald-400 to-teal-500',
    glow: 'shadow-emerald-400/25',
    title: 'Paiement confirmé',
    message: 'Votre paiement a bien été reçu et votre commande est confirmée.',
    statusLabel: 'Payée',
    statusTone: 'text-emerald-600 bg-emerald-50',
  },
  cancelled: {
    icon: Ban,
    gradient: 'from-slate-300 to-slate-500',
    glow: 'shadow-slate-400/20',
    title: 'Paiement annulé',
    message: "Votre paiement n'a pas été finalisé et la commande associée a été annulée.",
    statusLabel: 'Annulée',
    statusTone: 'text-slate-600 bg-slate-100',
  },
  failed: {
    icon: AlertTriangle,
    gradient: 'from-rose-400 to-red-500',
    glow: 'shadow-rose-400/20',
    title: 'Paiement échoué',
    message: "Le paiement n'a pas pu être finalisé et la commande associée a été annulée.",
    statusLabel: 'Annulée',
    statusTone: 'text-rose-600 bg-rose-50',
  },
}

export function PaymentOutcomeCard({ outcome, order }: { outcome: PaymentOutcome; order: ApiOrder }) {
  const navigate = useNavigate()
  const content = OUTCOME_CONTENT[outcome]
  const Icon = content.icon
  const date = new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 sm:py-20">
      <div className="max-w-lg w-full mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center gap-6">

          {/* Icône */}
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}>
            <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${content.gradient} flex items-center justify-center shadow-xl ${content.glow}`}>
              <Icon size={44} className="text-white" strokeWidth={1.5} />
            </div>
          </motion.div>

          {/* Titre + message */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{content.title}</h1>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed max-w-sm mx-auto">{content.message}</p>
          </motion.div>

          {/* Détails commande */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left">
            <dl className="space-y-3">
              {[
                ['Commande', order.orderNumber],
                ['Montant', fmtPrice(order.total)],
                ['Paiement', PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod],
                ['Date', date],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <dt className="text-gray-400">{label}</dt>
                  <dd className="font-semibold text-gray-900 font-mono text-right">{value}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-100">
                <dt className="text-gray-400">Statut</dt>
                <dd>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${content.statusTone}`}>
                    {content.statusLabel}
                  </span>
                </dd>
              </div>
            </dl>
          </motion.div>

          {/* Actions */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="w-full flex flex-col gap-3">
            {outcome === 'success' ? (
              <button onClick={() => navigate(`/commandes/${order.orderNumber}`)}
                className="w-full h-12 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                <ListOrdered size={16} /> Voir ma commande
              </button>
            ) : (
              <button onClick={() => navigate('/catalogue')}
                className="w-full h-12 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                <ShoppingBag size={16} /> Nouvelle commande
              </button>
            )}
            <button onClick={() => navigate('/')}
              className="w-full h-12 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
              <Home size={16} /> Retour à l'accueil
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
