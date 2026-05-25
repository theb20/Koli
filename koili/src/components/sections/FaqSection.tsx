import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Minus, MessageCircle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Btn from '../ui/btnStyle'
import BorderGlow from '../ui/BorderGlow'

/* ─────────────────────────────────────────
   BRAND COLOR
───────────────────────────────────────── */
const BLUE = '#0421ff'

/* ─────────────────────────────────────────
   DATA
───────────────────────────────────────── */
const FAQS = [
  {
    q: 'Quels modes de paiement acceptez-vous ?',
    a: 'Nous acceptons Mobile Money (Orange Money, MTN MoMo, Wave), les cartes bancaires Visa & Mastercard, ainsi que le virement bancaire. Tous les paiements sont sécurisés par chiffrement SSL. Aucune donnée bancaire n\'est stockée sur nos serveurs.',
  },
  {
    q: 'Combien de temps prend la livraison ?',
    a: 'La livraison standard est effectuée en 2 à 5 jours ouvrés en Côte d\'Ivoire. Pour Abidjan, une livraison express J+1 est disponible moyennant supplément. Les délais peuvent varier en période de forte demande (promotions, fêtes).',
  },
  {
    q: 'Comment suivre ma commande en temps réel ?',
    a: 'Dès l\'expédition de votre colis, vous recevez un SMS et un e-mail contenant un lien de suivi en temps réel. Vous pouvez également consulter l\'état de votre commande à tout moment depuis votre espace client, rubrique « Mes commandes ».',
  },
  {
    q: 'Puis-je retourner ou échanger un produit ?',
    a: 'Oui. Vous disposez de 30 jours à compter de la réception pour nous retourner tout produit non conforme ou défectueux. Le remboursement est effectué sous 3 à 5 jours ouvrés, via le même moyen de paiement utilisé lors de l\'achat. Les frais de retour sont pris en charge par Dropship si le défaut est avéré.',
  },
  {
    q: 'Vos produits sont-ils authentiques et garantis ?',
    a: 'Chaque produit référencé sur Dropship est sourcé auprès de fournisseurs certifiés et passe un contrôle qualité avant mise en vente. Tous les appareils électroniques bénéficient d\'une garantie constructeur de 12 à 24 mois. En cas de problème, notre équipe SAV vous accompagne jusqu\'à la résolution.',
  },
  {
    q: 'Comment contacter le service client ?',
    a: 'Notre support est disponible 7j/7 de 8 h à 20 h (GMT) via le chat en ligne, par e-mail à support@dropship.fr, ou par téléphone au +225 07 000 00 00. Temps de réponse moyen : moins d\'une heure.',
  },
  {
    q: 'Livrez-vous dans d\'autres pays d\'Afrique ?',
    a: 'Oui ! Nous livrons actuellement en Côte d\'Ivoire, au Sénégal, au Mali, au Burkina Faso, au Ghana et au Togo. Des frais et délais spécifiques s\'appliquent selon la destination. D\'autres pays seront bientôt disponibles — suivez nos actualités.',
  },
  {
    q: 'Comment devenir vendeur sur Dropship ?',
    a: 'Vous avez des produits à proposer ? Créez votre compte vendeur en quelques minutes, soumettez vos produits pour validation et commencez à vendre. Notre équipe vous accompagne gratuitement dans l\'intégration de votre catalogue et la mise en place de votre vitrine.',
  },
]

/* ─────────────────────────────────────────
   ACCORDION ITEM
───────────────────────────────────────── */
function FaqItem({
  question,
  answer,
  index,
  isOpen,
  onToggle,
}: {
  question: string
  answer: string
  index: number
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        onClick={onToggle}
        className="group w-full text-left"
        aria-expanded={isOpen}
      >
        <div
          className={`relative flex items-start gap-5 border-b py-6 transition-colors duration-200 ${
            isOpen ? 'border-gray-200' : 'border-gray-100 hover:border-gray-200'
          }`}
        >
          {/* Ghost number */}
          <span
            aria-hidden
            className="absolute right-10 top-4 select-none text-[56px] font-black leading-none tabular-nums transition-opacity duration-300"
            style={{ color: isOpen ? `${BLUE}08` : '#f3f4f6', letterSpacing: '-0.04em' }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>

          {/* Number chip */}
          <span
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black transition-all duration-300"
            style={{
              background: isOpen ? BLUE : '#f3f4f6',
              color: isOpen ? '#fff' : '#9ca3af',
            }}
          >
            {String(index + 1).padStart(2, '0')}
          </span>

          {/* Question */}
          <span
            className={`flex-1 pr-10 text-[15px] font-semibold leading-snug transition-colors duration-200 ${
              isOpen ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'
            }`}
          >
            {question}
          </span>

          {/* Toggle icon */}
          <span
            className="relative ml-auto mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300"
            style={{
              background: isOpen ? BLUE : '#f3f4f6',
              color: isOpen ? '#fff' : '#6b7280',
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isOpen ? 'minus' : 'plus'}
                initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                animate={{ rotate: 0,   opacity: 1, scale: 1   }}
                exit={{   rotate:  90, opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.18 }}
                className="absolute flex items-center justify-center"
              >
                {isOpen ? <Minus size={13} strokeWidth={2.5} /> : <Plus size={13} strokeWidth={2.5} />}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
      </button>

      {/* Answer */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{   height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div
              className="relative border-b border-gray-100 py-5 pl-12 pr-4"
            >
              {/* Accent bar */}
              <motion.span
                layoutId={`bar-${index}`}
                className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full"
                style={{ background: BLUE }}
              />
              <p className="text-sm leading-relaxed text-gray-500">{answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─────────────────────────────────────────
   SECTION
───────────────────────────────────────── */
export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  const toggle = (i: number) => setOpenIdx(prev => (prev === i ? null : i))

  return (
    <section className="relative overflow-hidden bg-white py-24 sm:py-32">

      {/* Background decoration */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
      >
        {/* Top-right gradient orb */}
        <div
          className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full blur-[120px]"
          style={{ background: `${BLUE}07` }}
        />
        {/* Bottom-left */}
        <div
          className="absolute -bottom-24 -left-24 h-[380px] w-[380px] rounded-full blur-[100px]"
          style={{ background: `${BLUE}05` }}
        />
        {/* Dots grid */}
        <svg
          className="absolute left-0 top-0 h-full w-48 opacity-[0.025]"
          style={{ color: BLUE }}
        >
          <defs>
            <pattern id="faq-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#faq-dots)" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">

        {/* ── Header row ── */}
        <div className="mb-14 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">

          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-xl"
          >
            {/* Badge */}
            <span
              className="mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em]"
              style={{ background: `${BLUE}10`, color: BLUE }}
            >
              Foire aux questions
            </span>

            <h2 className="text-4xl  leading-[1.05] tracking-tight text-gray-900 sm:text-5xl">
              Vos questions,{' '}
              <span
                className="relative inline-block"
                style={{ color: BLUE }}
              >
                nos réponses
                {/* Underline squiggle */}
                <svg
                  aria-hidden
                  viewBox="0 0 200 12"
                  className="absolute -bottom-2 left-0 w-full"
                  preserveAspectRatio="none"
                >
                  <motion.path
                    d="M2 9 Q 25 2, 50 8 T 100 8 T 150 8 T 198 5"
                    fill="none"
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke={BLUE}
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 0.35 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.4, ease: 'easeInOut' }}
                  />
                </svg>
              </span>
            </h2>

            <p className="mt-5 text-base leading-relaxed text-gray-400">
              Vous ne trouvez pas la réponse ? Notre équipe support répond en moins d'une heure,
              7 jours sur 7.
            </p>
          </motion.div>

           {/* BorderGlow card */}
        <BorderGlow
          edgeSensitivity={30}
          glowColor="40 80 80"
          backgroundColor="#120F17"
          borderRadius={28}
          glowRadius={40}
          glowIntensity={1}
          coneSpread={25}
          animated={false}
          colors={['#c084fc', '#f472b6', '#38bdf8']}
        >
        <div className="p-8">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">
            Pas trouvé votre réponse ?
          </p>
          <h2 className="text-white text-2xl font-semibold mb-2">
            On est là pour vous.
          </h2>
          <p className="text-white/50 text-sm leading-relaxed max-w-md">
            Notre équipe répond en moins d'une heure — commande, livraison, retour ou paiement, on gère tout.
          </p>
        </div>
        </BorderGlow>
        </div>

        {/* ── Accordion ── */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-16">
          {/* Col 1 — questions impaires */}
          <div>
            {FAQS.filter((_, i) => i % 2 === 0).map((faq, colIdx) => {
              const globalIdx = colIdx * 2
              return (
                <FaqItem
                  key={globalIdx}
                  question={faq.q}
                  answer={faq.a}
                  index={globalIdx}
                  isOpen={openIdx === globalIdx}
                  onToggle={() => toggle(globalIdx)}
                />
              )
            })}
          </div>

          {/* Col 2 — questions paires */}
          <div>
            {FAQS.filter((_, i) => i % 2 !== 0).map((faq, colIdx) => {
              const globalIdx = colIdx * 2 + 1
              return (
                <FaqItem
                  key={globalIdx}
                  question={faq.q}
                  answer={faq.a}
                  index={globalIdx}
                  isOpen={openIdx === globalIdx}
                  onToggle={() => toggle(globalIdx)}
                />
              )
            })}
          </div>
        </div>

        {/* ── Bottom stat strip ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.3 }}
          className="mt-16 grid grid-cols-2 divide-x divide-gray-100 rounded-2xl border border-gray-100 bg-gray-50 sm:grid-cols-4"
        >
          {[
            { value: '< 1 h',   label: 'Temps de réponse'    },
            { value: '7j/7',    label: 'Disponibilité support' },
            { value: '4,8 ★',   label: 'Note satisfaction'    },
            { value: '12 000+', label: 'Clients actifs'       },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1 px-4 py-5 text-center">
              <span className="text-2xl font-black tracking-tight text-gray-900">{value}</span>
              <span className="text-[11px] text-gray-400">{label}</span>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
