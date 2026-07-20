import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Bell, MessageCircle, X } from 'lucide-react'
import { usePaymentNotice } from '../../hooks/usePaymentNotice'
import { useSiteSettings, waLink } from '../../hooks/useSiteSettings'

const WHATSAPP_PREFILL = "Bonjour, je souhaite payer ma commande sur Skignas."

export function PaymentNoticeModal() {
  const { open, dismiss } = usePaymentNotice()
  const settings = useSiteSettings()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Fermeture au clavier (ESC) + focus initial sur le panneau.
  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [open, dismiss])

  const handlePayViaWhatsapp = () => {
    dismiss()
    window.open(waLink(settings.whatsappNumber, WHATSAPP_PREFILL), '_blank', 'noopener,noreferrer')
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Fond sombre flouté */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={dismiss}
            className="fixed inset-0 z-[9995] bg-gray-900/50 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Panneau */}
          <div className="fixed inset-0 z-[9996] flex items-center justify-center p-4">
            <motion.div
              key="modal"
              ref={dialogRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="payment-notice-title"
              aria-describedby="payment-notice-desc"
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-md bg-white rounded-[20px] overflow-hidden outline-none"
              style={{ boxShadow: '0 25px 70px -15px rgba(15,23,42,0.35)' }}
            >
              {/* Fermer */}
              <button
                onClick={dismiss}
                aria-label="Fermer"
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={16} />
              </button>

              <div className="px-7 pt-8 pb-7">
                {/* Icône — dégradé bleu discret */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                >
                  <Bell size={20} className="text-white" />
                </div>

                <h2 id="payment-notice-title" className="text-[19px] font-bold text-gray-900 tracking-tight">
                  Information importante
                </h2>

                <div id="payment-notice-desc" className="mt-3 space-y-3 text-[13.5px] text-gray-600 leading-relaxed">
                  <p>
                    Les solutions de paiement affichées sur notre plateforme sont actuellement{' '}
                    <strong className="text-gray-800 font-semibold">en cours d'intégration et de validation technique</strong>.
                  </p>
                  <p>Durant cette phase de mise en service, les paiements en ligne ne sont pas encore disponibles.</p>
                  <p>
                    Pour finaliser votre commande, veuillez effectuer votre paiement manuellement au numéro suivant :
                  </p>

                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
                    <span className="text-lg">📱</span>
                    <span className="text-[15px] font-bold text-blue-700 tracking-wide">{settings.supportPhone}</span>
                  </div>

                  <p>
                    Après votre paiement, notre équipe vérifiera la transaction et confirmera votre commande dans les meilleurs délais.
                  </p>
                  <p className="text-gray-500">Nous vous remercions pour votre confiance et votre compréhension.</p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2.5 mt-6">
                  <button
                    onClick={dismiss}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
                  >
                    J'ai compris
                  </button>
                  <button
                    onClick={handlePayViaWhatsapp}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
                  >
                    <MessageCircle size={15} />
                    Payer via WhatsApp
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
