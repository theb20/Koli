import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import {
  Loader2, AlertCircle, CheckCircle2, Clock, XCircle, Package,
  MapPin, CreditCard, Shield, MessageCircle, ArrowLeft, Truck,
} from 'lucide-react'
import { PageMeta } from '../components/seo/PageMeta'
import { useAuth } from '../contexts/AuthContext'
import { useSiteSettings, waLink } from '../hooks/useSiteSettings'
import { fetchQuote, acceptQuote, declineQuote, verifyQuotePayment, type ApiQuote } from '../lib/api'

const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' FCFA'
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const MAX_VERIFY_ATTEMPTS = 6
const VERIFY_DELAY_MS     = 1500

/** Où en est le devis, du point de vue du client. */
type Phase =
  | 'open'            // devis valable : accepter/payer ou refuser
  | 'expired'         // plus acceptable, redemander un prix
  | 'awaiting'        // accepté, paiement pas encore reçu
  | 'payment-failed'  // paiement annulé/échoué — peut réessayer
  | 'paid'            // payé — achat en cours
  | 'delivered'
  | 'declined'
  | 'closed'          // refusé/annulé par Skignas

function phaseOf(q: ApiQuote): Phase {
  if (q.status === 'fulfilled') return 'delivered'
  if (q.status === 'paid' || q.order?.paymentStatus === 'paid') return 'paid'
  if (q.status === 'declined') return 'declined'
  if (q.status === 'rejected' || q.status === 'cancelled') return 'closed'
  if (q.status === 'accepted') return q.order?.status === 'cancelled' ? 'payment-failed' : 'awaiting'
  return q.expired ? 'expired' : 'open'
}

/**
 * Devis de sourcing — ouvert depuis le lien personnel reçu par e-mail/SMS
 * (fonctionne sans compte). Le client y accepte et paie en ligne
 * (WiniPayer, 100 % à la commande) ou refuse. Au retour de WiniPayer
 * (?retour=1), le statut réel est revérifié côté serveur — jamais déduit de
 * l'URL de redirection.
 */
export default function QuotePage() {
  const { token: quoteToken = '' } = useParams<{ token: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()
  const settings = useSiteSettings()
  const qc = useQueryClient()

  const [paying,       setPaying]       = useState(false)
  const [declining,    setDeclining]    = useState(false)
  const [showDecline,  setShowDecline]  = useState(false)
  const [reason,       setReason]       = useState('')
  const [actionError,  setActionError]  = useState('')
  const [verifying,    setVerifying]    = useState(searchParams.get('retour') === '1')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['quote', quoteToken],
    queryFn:  () => fetchQuote(quoteToken),
    enabled:  !!quoteToken,
    retry:    false,
  })
  const quote = data?.data

  /* ── Retour de WiniPayer : revérification réelle, quelques essais le
        temps que la passerelle rende un statut définitif ── */
  const cancelledRef = useRef(false)
  useEffect(() => () => { cancelledRef.current = true }, [])
  useEffect(() => {
    if (!verifying || !quoteToken) return
    let attempt = 0
    const run = async () => {
      attempt++
      try {
        const res = await verifyQuotePayment(quoteToken)
        if (cancelledRef.current) return
        qc.setQueryData(['quote', quoteToken], res)
        const pending = res.data.order && res.data.order.paymentStatus !== 'paid' && res.data.order.status !== 'cancelled'
        if (pending && attempt < MAX_VERIFY_ATTEMPTS) { setTimeout(run, VERIFY_DELAY_MS); return }
      } catch { /* on affiche l'état connu */ }
      if (cancelledRef.current) return
      setVerifying(false)
      setSearchParams({}, { replace: true })
    }
    run()
  }, [verifying, quoteToken, qc, setSearchParams])

  const handleAccept = async () => {
    setPaying(true)
    setActionError('')
    try {
      const res = await acceptQuote(quoteToken)
      window.location.href = res.data.paymentUrl
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Le paiement n\'a pas pu être lancé. Réessayez.')
      qc.invalidateQueries({ queryKey: ['quote', quoteToken] })
      setPaying(false)
    }
  }

  const handleDecline = async () => {
    setDeclining(true)
    setActionError('')
    try {
      const res = await declineQuote(quoteToken, reason.trim() || undefined)
      qc.setQueryData(['quote', quoteToken], res)
      setShowDecline(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur, réessayez.')
    } finally {
      setDeclining(false)
    }
  }

  /* ── Chargement / introuvable ── */
  if (isLoading || verifying) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4">
        <PageMeta title="Mon devis" noIndex />
        <Loader2 size={32} className="animate-spin text-gray-300" />
        {verifying && <p className="text-sm text-gray-500">Vérification de votre paiement…</p>}
      </div>
    )
  }

  if (isError || !quote) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <PageMeta title="Devis introuvable" noIndex />
        <AlertCircle size={40} className="text-gray-300" />
        <p className="text-xl text-gray-900">Devis introuvable</p>
        <p className="text-sm text-gray-500 max-w-sm">Ce lien n'est pas valide. Vérifiez le lien reçu par e-mail ou contactez-nous.</p>
        <Link to="/contact" className="mt-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition">
          Nous contacter
        </Link>
      </div>
    )
  }

  const phase = phaseOf(quote)
  const canPay     = phase === 'open' || phase === 'awaiting' || phase === 'payment-failed'
  const canDecline = phase === 'open' || phase === 'awaiting' || phase === 'payment-failed'

  return (
    <div className="min-h-screen bg-gray-50/70">
      <PageMeta title="Mon devis" noIndex />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        {isAuthenticated && (
          <Link to="/profil?tab=sourcing" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={14} /> Mes demandes de sourcing
          </Link>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Devis de sourcing</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{quote.productName}</h1>
          <p className="text-sm text-gray-500 mt-1">Demande du {fmtDate(quote.createdAt)}</p>
        </div>

        <StatusBanner quote={quote} phase={phase} />

        {/* Produit */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-xl bg-gray-50 border border-gray-100 shrink-0 overflow-hidden flex items-center justify-center">
              {quote.images[0]
                ? <img src={quote.images[0]} alt={quote.productName} className="w-full h-full object-cover" />
                : <Package size={26} className="text-gray-300" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-600 line-clamp-4 whitespace-pre-line">{quote.description}</p>
              <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                <MapPin size={12} /> Livraison : {quote.deliveryAddress}
              </p>
            </div>
          </div>

          {quote.adminReply && (
            <div className="mt-4 p-4 rounded-xl bg-blue-50/60 border border-blue-100">
              <p className="text-xs font-semibold text-blue-900 mb-1">Message de l'équipe Skignas</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{quote.adminReply}</p>
            </div>
          )}
        </div>

        {/* Montants */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2.5">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Prix unitaire</span>
            <span className="font-medium text-gray-700">{fmt(quote.unitPrice)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Quantité</span>
            <span className="font-medium text-gray-700">{quote.quantity}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Sous-total HT</span>
            <span className="font-medium text-gray-700">{fmt(quote.subtotal)}</span>
          </div>
          {quote.taxRate > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>TVA ({quote.taxRate.toFixed(0)}%)</span>
              <span className="font-medium text-gray-700">{fmt(quote.taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-gray-500">
            <span className="flex items-center gap-1"><Truck size={12} /> Livraison</span>
            <span className="font-semibold text-emerald-600">Incluse</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
            <span className="font-bold text-lg text-gray-900">Total TTC</span>
            <span className="font-black text-xl text-gray-900">{fmt(quote.total)}</span>
          </div>
          {phase === 'open' && quote.quoteExpiresAt && (
            <p className="flex items-center gap-1.5 text-xs text-gray-500 pt-1">
              <Clock size={12} /> Devis valable jusqu'au {fmtDate(quote.quoteExpiresAt)}
            </p>
          )}
        </div>

        {/* Actions */}
        {actionError && (
          <div className="flex items-start gap-2 p-4 rounded-xl bg-red-50 border border-red-100">
            <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{actionError}</p>
          </div>
        )}

        {canPay && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <button onClick={handleAccept} disabled={paying || declining}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60">
              {paying ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
              {phase === 'open' ? `Accepter et payer ${fmt(quote.total)}`
                : phase === 'payment-failed' ? 'Réessayer le paiement'
                : `Payer ${fmt(quote.total)}`}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
              <Shield size={11} className="text-emerald-500" />
              Paiement sécurisé en ligne · Orange Money, MTN, Wave ou carte
            </p>

            {canDecline && !showDecline && (
              <button onClick={() => setShowDecline(true)} disabled={paying}
                className="w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 transition-colors">
                Refuser ce devis
              </button>
            )}

            <AnimatePresence>
              {showDecline && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden">
                  <div className="pt-2 space-y-2">
                    <label className="text-xs font-semibold text-gray-600">Pourquoi refusez-vous ? (facultatif)</label>
                    <textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={500} rows={3}
                      placeholder="Prix trop élevé, délai trop long, j'ai trouvé ailleurs…"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400" />
                    <div className="flex gap-2">
                      <button onClick={() => setShowDecline(false)} disabled={declining}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 transition-colors">
                        Annuler
                      </button>
                      <button onClick={handleDecline} disabled={declining}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60">
                        {declining && <Loader2 size={14} className="animate-spin" />} Confirmer le refus
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {(phase === 'paid' || phase === 'delivered') && quote.order && isAuthenticated && (
          <Link to={`/commandes/${quote.order.orderNumber}`}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors">
            <Package size={16} /> Suivre ma commande {quote.order.orderNumber}
          </Link>
        )}

        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4 flex items-center justify-between gap-3">
          <p className="text-xs text-blue-900">Une question sur ce devis ?</p>
          <a href={waLink(settings.whatsappNumber)} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors">
            <MessageCircle size={13} /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}

function StatusBanner({ quote, phase }: { quote: ApiQuote; phase: Phase }) {
  const cfg: Record<Phase, { icon: React.ReactNode; title: string; text: string; cls: string }> = {
    'open': {
      icon: <Clock size={18} />, cls: 'bg-blue-50 border-blue-100 text-blue-900',
      title: 'Votre devis est prêt',
      text: 'Acceptez-le pour payer en ligne : nous lançons l\'achat dès réception du paiement.',
    },
    'expired': {
      icon: <AlertCircle size={18} />, cls: 'bg-amber-50 border-amber-100 text-amber-900',
      title: 'Ce devis a expiré',
      text: 'Les prix fournisseurs évoluent : contactez-nous pour obtenir un nouveau devis.',
    },
    'awaiting': {
      icon: <Clock size={18} />, cls: 'bg-amber-50 border-amber-100 text-amber-900',
      title: 'Paiement en attente',
      text: 'Vous avez accepté ce devis, mais nous n\'avons pas encore reçu votre paiement.',
    },
    'payment-failed': {
      icon: <AlertCircle size={18} />, cls: 'bg-red-50 border-red-100 text-red-900',
      title: 'Paiement non abouti',
      text: 'Votre paiement a été annulé ou refusé. Aucun montant n\'a été débité — vous pouvez réessayer.',
    },
    'paid': {
      icon: <CheckCircle2 size={18} />, cls: 'bg-emerald-50 border-emerald-100 text-emerald-900',
      title: 'Paiement reçu — merci !',
      text: 'Nous lançons l\'achat de votre produit et vous tenons informé de la livraison.',
    },
    'delivered': {
      icon: <CheckCircle2 size={18} />, cls: 'bg-emerald-50 border-emerald-100 text-emerald-900',
      title: 'Commande livrée',
      text: 'Votre produit vous a été livré. Merci de votre confiance !',
    },
    'declined': {
      icon: <XCircle size={18} />, cls: 'bg-gray-100 border-gray-200 text-gray-800',
      title: 'Vous avez refusé ce devis',
      text: quote.declineReason ? `Motif : ${quote.declineReason}` : 'Aucun paiement n\'a été effectué.',
    },
    'closed': {
      icon: <XCircle size={18} />, cls: 'bg-gray-100 border-gray-200 text-gray-800',
      title: 'Demande clôturée',
      text: 'Cette demande a été clôturée par notre équipe. Contactez-nous pour plus d\'informations.',
    },
  }
  const c = cfg[phase]
  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border ${c.cls}`}>
      <div className="shrink-0 mt-0.5">{c.icon}</div>
      <div>
        <p className="text-sm font-bold">{c.title}</p>
        <p className="text-sm opacity-80 mt-0.5">{c.text}</p>
      </div>
    </div>
  )
}
