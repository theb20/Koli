import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, ChevronRight, ShieldCheck, FileText,
  Lock, Star, Truck, RotateCcw, Package, Zap, Gift,
  Check, ArrowRight,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSiteSettings } from '../hooks/useSiteSettings'

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
const TOTAL_STEPS = 4

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <motion.div
            animate={{
              width:      i < step ? 32 : i === step ? 32 : 8,
              background: i < step ? '#10b981' : i === step ? '#0421ff' : '#e5e7eb',
            }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="h-2 rounded-full"
            style={{ minWidth: 8 }}
          />
        </div>
      ))}
      <span className="text-xs text-gray-400 font-medium ml-1">{step + 1} / {TOTAL_STEPS}</span>
    </div>
  )
}

function AcceptBox({ checked, onToggle, children }: {
  checked: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
        checked
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className={`mt-0.5 w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all ${
        checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
      }`}>
        {checked && <Check size={11} className="text-white" strokeWidth={3} />}
      </div>
      <span className="text-sm text-gray-700 leading-relaxed">{children}</span>
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ÉTAPES
═══════════════════════════════════════════════════════════════ */

/* ── Étape 0 : Bienvenue ── */
function StepBienvenue({ prenom, onNext }: { prenom: string; onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
        className="w-24 h-24 rounded-full flex items-center justify-center "
      >
        <img src="/imgs_dropship/sk_black.png" alt="logo Skignas" />
      </motion.div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Bienvenue, {prenom} ! 🎉
        </h1>
        <p className="text-gray-500 mt-2 leading-relaxed max-w-sm">
          Votre compte Skignas est prêt. Avant de commencer vos achats, prenez 2 minutes pour lire nos engagements.
        </p>
      </div>

      {/* Avantages */}
      <div className="w-full grid grid-cols-2 gap-3 mt-2">
        {[
          { icon: <Truck size={18} />,     color: 'text-blue-600 bg-blue-50',    label: 'Livraison rapide',    desc: 'Standard 3–5j ou Express 24–72h' },
          { icon: <ShieldCheck size={18}/>, color: 'text-emerald-600 bg-emerald-50', label: 'Paiement sécurisé', desc: 'Orange Money, MTN, Wave, cash' },
          { icon: <RotateCcw size={18} />, color: 'text-orange-600 bg-orange-50', label: 'Suivi en temps réel', desc: 'Email à chaque étape' },
          { icon: <Gift size={18} />,      color: 'text-yellow-600 bg-yellow-50', label: 'Programme fidélité',  desc: 'Points sur chaque achat' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
              {item.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 leading-tight">{item.label}</p>
              <p className="text-[11px] text-gray-400">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/10"
      >
        Commencer <ArrowRight size={16} />
      </button>
    </div>
  )
}

/* ── Étape 1 : Conditions d'utilisation ── */
function StepCGU({ onNext }: { onNext: () => void }) {
  const [accepted, setAccepted] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <FileText size={20} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-black text-gray-900">Conditions d'utilisation</h2>
          <p className="text-xs text-gray-400">Points essentiels à connaître</p>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto max-h-72 space-y-3 pr-1 scrollbar-thin">
        {[
          {
            icon: <Package size={15} />, color: 'bg-blue-50 text-blue-600',
            title: 'Commandes et livraison',
            body: 'Toute commande est ferme et définitive après confirmation du paiement. Deux modes de livraison : Standard (3 à 5 jours, 1 500 FCFA, gratuite dès 25 000 FCFA d\'achat) ou Express (24 à 72h garanties, 3 500 FCFA). Un email vous est envoyé à chaque changement de statut de votre commande.',
          },
          {
            icon: <RotateCcw size={15} />, color: 'bg-orange-50 text-orange-600',
            title: 'Annulation et remboursement',
            body: 'Vous pouvez annuler gratuitement une commande tant qu\'elle est au statut « en attente » ou « confirmée », directement depuis « Mes commandes ». Au-delà, l\'annulation doit être demandée auprès du service client. Toute commande annulée ou remboursée fait l\'objet d\'un email de confirmation.',
          },
          {
            icon: <Zap size={15} />, color: 'bg-purple-50 text-purple-600',
            title: 'Produit introuvable ?',
            body: 'Vous ne trouvez pas ce que vous cherchez ? Soumettez une demande de sourcing (nom, description, photos, budget indicatif) depuis la page « Trouver un produit ». Nous étudions chaque demande et répondons par email, généralement sous 24 à 48 heures.',
          },
          {
            icon: <Lock size={15} />, color: 'bg-emerald-50 text-emerald-600',
            title: 'Utilisation du compte',
            body: 'Votre compte Skignas est personnel et non transférable. Vous êtes responsable de la confidentialité de votre accès. Toute utilisation frauduleuse doit nous être signalée immédiatement. L\'accès est réservé aux personnes de 18 ans ou plus.',
          },
        ].map(item => (
          <div key={item.title} className="p-4 rounded-xl border border-gray-100 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${item.color}`}>
                {item.icon}
              </span>
              <p className="text-sm font-bold text-gray-900">{item.title}</p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{item.body}</p>
          </div>
        ))}

        <p className="text-[11px] text-gray-400 text-center pt-2">
          Document complet disponible sur{' '}
          <a href="/cgu" target="_blank" rel="noreferrer" className="text-blue-600 underline">skignas.com/cgu</a>
        </p>
      </div>

      <AcceptBox checked={accepted} onToggle={() => setAccepted(v => !v)}>
        J'ai lu et j'accepte les <strong>Conditions Générales d'Utilisation</strong> de Skignas. Je comprends mes droits et obligations en tant qu'acheteur.
      </AcceptBox>

      <button
        onClick={onNext}
        disabled={!accepted}
        className="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/10 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Accepter et continuer <ChevronRight size={16} />
      </button>
    </div>
  )
}

/* ── Étape 2 : Politique de confidentialité ── */
function StepConfidentialite({ onNext, supportEmail }: { onNext: () => void; supportEmail: string }) {
  const [accepted, setAccepted] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Lock size={20} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-black text-gray-900">Confidentialité & RGPD</h2>
          <p className="text-xs text-gray-400">Comment nous protégeons vos données</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-72 space-y-3 pr-1">
        {[
          {
            icon: '📋', title: 'Données collectées',
            body: 'Nous collectons uniquement les informations nécessaires : nom, email, adresse de livraison et historique d\'achats. Aucune donnée bancaire n\'est stockée sur nos serveurs — les paiements Mobile Money sont traités directement par les opérateurs.',
          },
          {
            icon: '🔒', title: 'Utilisation de vos données',
            body: 'Vos données servent exclusivement à gérer vos commandes, vous envoyer des confirmations et améliorer votre expérience. Nous ne vendons, ne louons ni ne partageons jamais vos informations personnelles avec des tiers sans votre consentement.',
          },
          {
            icon: '⚙️', title: 'Vos droits (RGPD)',
            body: `Vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité de vos données. Pour exercer ces droits, contactez-nous à ${supportEmail}. Toute demande est traitée sous 30 jours conformément au RGPD.`,
          },
          {
            icon: '🍪', title: 'Cookies',
            body: 'Skignas utilise uniquement des cookies fonctionnels indispensables à votre connexion (session sécurisée). Nos statistiques de fréquentation sont mesurées via Plausible Analytics, une solution sans cookies et respectueuse de la vie privée.',
          },
          {
            icon: '🔞', title: 'Âge minimum',
            body: 'Skignas est réservé aux personnes de 18 ans ou plus. Nous ne collectons pas sciemment de données concernant des mineurs.',
          },
          {
            icon: '📧', title: 'Communications',
            body: 'Vous recevrez des emails transactionnels liés à vos commandes (confirmation, suivi, livraison). Les communications marketing sont optionnelles et vous pouvez vous désabonner à tout moment via le lien en bas de chaque email.',
          },
        ].map(item => (
          <div key={item.title} className="p-4 rounded-xl border border-gray-100 bg-white">
            <p className="text-sm font-bold text-gray-900 mb-1.5">{item.icon} {item.title}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{item.body}</p>
          </div>
        ))}

        <p className="text-[11px] text-gray-400 text-center pt-2">
          Politique complète sur{' '}
          <a href="/privacy" target="_blank" rel="noreferrer" className="text-blue-600 underline">skignas.com/privacy</a>
        </p>
      </div>

      <AcceptBox checked={accepted} onToggle={() => setAccepted(v => !v)}>
        J'accepte la <strong>Politique de confidentialité</strong> de Skignas et le traitement de mes données personnelles tel que décrit ci-dessus.
      </AcceptBox>

      <button
        onClick={onNext}
        disabled={!accepted}
        className="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/10 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Accepter et continuer <ChevronRight size={16} />
      </button>
    </div>
  )
}

/* ── Étape 3 : Confirmation finale ── */
function StepConfirmation({ prenom, onFinish }: { prenom: string; onFinish: (dest: 'catalogue' | 'profil') => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
        className="relative"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-400/30">
          <CheckCircle2 size={48} className="text-white" strokeWidth={1.5} />
        </div>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
          className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg"
        >
          <Star size={14} className="text-yellow-900 fill-yellow-900" />
        </motion.div>
      </motion.div>

      <div>
        <h2 className="text-2xl font-black text-gray-900">Tout est en ordre, {prenom} !</h2>
        <p className="text-gray-500 mt-2 leading-relaxed max-w-sm">
          Vous avez accepté nos conditions. Votre compte est maintenant pleinement activé.
        </p>
      </div>

      {/* Récap acceptations */}
      <div className="w-full space-y-2.5">
        {[
          'Conditions Générales d\'Utilisation',
          'Politique de confidentialité & RGPD',
        ].map(item => (
          <div key={item} className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <Check size={12} className="text-white" strokeWidth={3} />
            </div>
            <p className="text-sm font-medium text-emerald-800">{item}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 -mt-2">
        Ces documents sont disponibles à tout moment dans votre profil.
      </p>

      {/* Choix destination */}
      <div className="w-full space-y-3 mt-2">
        <button
          onClick={() => onFinish('catalogue')}
          className="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/10"
        >
          <Package size={16} />
          Explorer le catalogue
        </button>
        <button
          onClick={() => onFinish('profil')}
          className="w-full py-3.5 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold text-sm flex items-center justify-center gap-2 hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Compléter mon profil
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════════════════════════════ */
export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const settings = useSiteSettings()
  const [step, setStep] = useState(0)

  const prenom = user?.prenom ?? 'là'

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1))

  const finish = (dest: 'catalogue' | 'profil') => {
    navigate(dest === 'catalogue' ? '/catalogue' : '/profil', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header minimal ── */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <img src="/imgs_dropship/logohori_dropship_white.png"
            className="h-7 invert opacity-80"
            alt="Skignas"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <ProgressBar step={step} />
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -32 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8"
            >
              {step === 0 && <StepBienvenue prenom={prenom} onNext={next} />}
              {step === 1 && <StepCGU onNext={next} />}
              {step === 2 && <StepConfidentialite onNext={next} supportEmail={settings.supportEmail} />}
              {step === 3 && <StepConfirmation prenom={prenom} onFinish={finish} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Footer minimal ── */}
      <div className="py-4 text-center">
        <p className="text-[11px] text-gray-300">
          © {new Date().getFullYear()} Skignas · {settings.address}
        </p>
      </div>
    </div>
  )
}
