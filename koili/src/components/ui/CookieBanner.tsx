import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Globe, Lock, ShieldCheck, BarChart2, Megaphone, Settings2, ChevronRight, ChevronLeft } from 'lucide-react'
import { enableAnalytics, disableAnalytics } from '../../lib/firebase'

/* ─────────────────────────────────────────
   TYPES & CONSTANTS
───────────────────────────────────────── */
export type CookiePrefs = {
  necessary:   true
  analytics:   boolean
  marketing:   boolean
  preferences: boolean
}

const STORAGE_KEY = 'koli_cookie_consent'
const TEAL = '#0800ffff'
const TEAL_DARK = '#3d9e94'

/* ─────────────────────────────────────────
   DATA
───────────────────────────────────────── */
const CATEGORIES = [
  {
    key:    'necessary' as const,
    icon:   ShieldCheck,
    label:  'Cookies essentiels',
    desc:   'Ces cookies sont nécessaires au fonctionnement du site. Ils ne peuvent pas être désactivés.',
    detail: 'session_id, csrf_token, cart_id · Durée : session',
    locked: true,
  },
  {
    key:    'analytics' as const,
    icon:   BarChart2,
    label:  'Cookies analytiques',
    desc:   'Ces cookies nous aident à comprendre comment vous utilisez notre site (Google Analytics 4).',
    detail: '_ga, _gid, _gat · Durée : 13 mois max',
    locked: false,
  },
  {
    key:    'marketing' as const,
    icon:   Megaphone,
    label:  'Cookies marketing',
    desc:   'Ces cookies permettent de vous proposer des publicités personnalisées sur d\'autres sites.',
    detail: 'fbp, _fbclid, gads · Durée : 6 mois',
    locked: false,
  },
  {
    key:    'preferences' as const,
    icon:   Settings2,
    label:  'Cookies de préférences',
    desc:   'Ces cookies mémorisent vos préférences (langue, région, thème).',
    detail: 'locale, theme, currency · Durée : 12 mois',
    locked: false,
  },
]

/* ─────────────────────────────────────────
   TOGGLE
───────────────────────────────────────── */
function Toggle({ on, locked, onChange }: { on: boolean; locked?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={() => !locked && onChange()}
      aria-pressed={on}
      className={`relative w-12 h-6 rounded-full shrink-0 transition-colors duration-300 focus:outline-none ${
        locked ? 'cursor-not-allowed' : 'cursor-pointer'
      }`}
      style={{ background: on ? TEAL : '#d1d5db' }}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 700, damping: 38 }}
        className="absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow-sm flex items-center justify-center"
        style={{ left: on ? '26px' : '3px' }}
      >
        {locked && <Lock size={8} className="text-gray-400" />}
      </motion.span>
    </button>
  )
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export function CookieBanner() {
  const [visible,  setVisible]  = useState(false)
  const [view,     setView]     = useState<'main' | 'settings'>('main')
  const [prefs,    setPrefs]    = useState<CookiePrefs>({
    necessary:   true,
    analytics:   false,
    marketing:   false,
    preferences: false,
  })

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      const t = setTimeout(() => setVisible(true), 2800)
      return () => clearTimeout(t)
    }
    const saved: CookiePrefs = JSON.parse(stored)
    if (saved.analytics) enableAnalytics()
    else disableAnalytics()
  }, [])

  function saveAndClose(accepted: CookiePrefs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accepted))
    if (accepted.analytics) enableAnalytics()
    else disableAnalytics()
    setVisible(false)
  }

  const acceptAll  = () => saveAndClose({ necessary: true, analytics: true,  marketing: true,  preferences: true  })
  const declineAll = () => saveAndClose({ necessary: true, analytics: false, marketing: false, preferences: false })
  const saveCustom = () => saveAndClose(prefs)

  function toggle(key: keyof Omit<CookiePrefs, 'necessary'>) {
    setPrefs(p => ({ ...p, [key]: !p[key] }))
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] bg-black/50"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.96,  y: 8  }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[9991] flex items-center justify-center p-4"
          >
            <div
              className="w-full max-w-xl bg-white rounded-sm overflow-hidden"
              style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.30)' }}
            >
              <AnimatePresence mode="wait" initial={false}>

                {/* ════════ VUE PRINCIPALE ════════ */}
                {view === 'main' && (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{   opacity: 0, x: -20 }}
                    transition={{ duration: 0.22 }}
                  >
                    {/* Top bar */}
                    <div className="flex items-center justify-between px-8 pt-7 pb-5">
                      {/* Logo */}
                      <img
                        src="/imgs_dropship/logohori_dropship.png"
                        alt="Logo"
                        className="h-8 w-auto object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      {/* Sélecteur de langue */}
                      <div className="relative flex items-center">
                        <Globe size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
                        <select
                          defaultValue="fr"
                          className="appearance-none pl-7 pr-6 py-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-full hover:border-gray-300 focus:outline-none focus:border-gray-400 cursor-pointer transition-colors"
                        >
                          <option value="fr">Français</option>
                        </select>
                        <svg className="absolute right-2 pointer-events-none text-gray-400" width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                          <path d="M5 7L1 3h8L5 7z"/>
                        </svg>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="px-8 pb-6">
                      <h2 className="text-[18px] font-bold text-gray-900 mb-4">
                        Paramètres de confidentialité
                      </h2>

                      <p className="text-[11px] text-justify text-gray-700 leading-relaxed mb-4">
                        Nous utilisons des cookies pour faire fonctionner notre site web. Cela nous permet de garantir
                        que toutes les fonctions seront continuellement améliorées et que les publicités basées
                        sur vos intérêts seront affichées.
                      </p>

                      <p className="text-[11px] text-justify text-gray-700 leading-relaxed mb-5">
                        En confirmant le bouton «&nbsp;Accepter&nbsp;», vous consentez à leur utilisation. Vous pouvez
                        utiliser le bouton «&nbsp;Paramètres supplémentaires&nbsp;» pour sélectionner les cookies
                        que vous souhaitez autoriser. Vous pouvez également{' '}
                        <button
                          onClick={declineAll}
                          className="underline underline-offset-2 font-medium hover:opacity-80 transition-opacity"
                          style={{ color: TEAL }}
                        >
                          refuser
                        </button>{' '}
                        l'utilisation des cookies. De plus amples informations sont disponibles dans notre Politique de confidentialité.
                      </p>

                      {/* Liens */}
                      <div className="flex items-center gap-5 mb-6">
                        <a href="/privacy" className="text-[11px] font-medium hover:opacity-80 transition-opacity" style={{ color: TEAL }}>
                          Politique de confidentialité
                        </a>
                        <a href="/legal" className="text-[11px] font-medium hover:opacity-80 transition-opacity" style={{ color: TEAL }}>
                          Mentions légales
                        </a>
                        <a href="/cgu" className="text-[11px] font-medium hover:opacity-80 transition-opacity" style={{ color: TEAL }}>
                          CGU
                        </a>
                      </div>

                      {/* Boutons */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setView('settings')}
                          className="flex items-center justify-center gap-2 py-4 px-6 text-[10px] font-bold text-white rounded-sm transition-opacity hover:opacity-90 active:opacity-80"
                          style={{ background: '#b0b8b8' }}
                        >
                          Paramètres supplémentaires
                          <ChevronRight size={16} />
                        </button>
                        <button
                          onClick={acceptAll}
                          className="py-4 px-6 text-[10px] font-bold text-white rounded-sm transition-opacity hover:opacity-90 active:opacity-80"
                          style={{ background: TEAL }}
                        >
                          Accepter
                        </button>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-3 border-t border-gray-100 text-center">
                      <p className="text-[10px] text-gray-400">
                        Propulsé par{' '}
                        <span className="font-semibold text-gray-500">Skignas Consent Management</span>
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* ════════ VUE PARAMÈTRES ════════ */}
                {view === 'settings' && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{   opacity: 0, x: 20 }}
                    transition={{ duration: 0.22 }}
                  >
                    {/* Top bar */}
                    <div className="flex items-center justify-between px-8 pt-7 pb-5">
                      <button
                        onClick={() => setView('main')}
                        className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
                      >
                        <ChevronLeft size={16} /> Retour
                      </button>
                      <div className="relative flex items-center">
                        <Globe size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
                        <select
                          defaultValue="fr"
                          className="appearance-none pl-7 pr-6 py-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-full hover:border-gray-300 focus:outline-none focus:border-gray-400 cursor-pointer transition-colors"
                        >
                          <option value="fr">Français</option>
                          <option value="en">English</option>
                          <option value="es">Español</option>
                        </select>
                        <svg className="absolute right-2 pointer-events-none text-gray-400" width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                          <path d="M5 7L1 3h8L5 7z"/>
                        </svg>
                      </div>
                    </div>

                    <div className="px-8 pb-6">
                      <h2 className="text-[15px] font-bold text-gray-900 mb-1">
                        Paramètres supplémentaires
                      </h2>
                      <p className="text-[11px] text-gray-500 mb-5">
                        Sélectionnez les catégories de cookies que vous souhaitez autoriser.
                      </p>

                      {/* Catégories */}
                      <div className="flex flex-col divide-y divide-gray-100 border border-gray-200 rounded-sm mb-5 overflow-hidden">
                        {CATEGORIES.map(cat => {
                          const Icon = cat.icon
                          const active = prefs[cat.key]
                          return (
                            <div key={cat.key} className="flex items-center gap-4 px-5 py-4 bg-white hover:bg-gray-50/50 transition-colors">
                              <Icon size={20} className="text-gray-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold text-gray-800">{cat.label}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{cat.desc}</p>
                                {cat.locked && (
                                  <p className="text-[10px] mt-0.5 font-medium" style={{ color: TEAL }}>
                                    Toujours actif
                                  </p>
                                )}
                              </div>
                              <Toggle
                                on={active}
                                locked={cat.locked}
                                onChange={() => cat.key !== 'necessary' && toggle(cat.key as keyof Omit<CookiePrefs, 'necessary'>)}
                              />
                            </div>
                          )
                        })}
                      </div>

                      {/* Boutons */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={declineAll}
                          className="py-3.5 text-[11px] font-bold text-white rounded-sm transition-opacity hover:opacity-90"
                          style={{ background: '#b0b8b8' }}
                        >
                          Tout refuser
                        </button>
                        <button
                          onClick={saveCustom}
                          className="py-3.5 text-[11px] font-bold text-white rounded-sm transition-opacity hover:opacity-90"
                          style={{ background: TEAL_DARK }}
                        >
                          Sauvegarder
                        </button>
                        <button
                          onClick={acceptAll}
                          className="py-3.5 text-[11px] font-bold text-white rounded-sm transition-opacity hover:opacity-90"
                          style={{ background: TEAL }}
                        >
                          Tout accepter
                        </button>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-3 border-t border-gray-100 text-center">
                      <p className="text-[10px] text-gray-400">
                        Propulsé par{' '}
                        <span className="font-semibold text-gray-500">Skignas Consent Management</span>
                      </p>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
