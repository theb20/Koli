import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { PageMeta } from '../components/seo/PageMeta'
import { useAuth } from '../contexts/AuthContext'

type LocationState = { tempToken?: string; redirectTo?: string }

/*
 * Étape intermédiaire commune aux trois chemins de connexion (mot de
 * passe, magic-link, Google) quand la 2FA est activée — le tempToken
 * émis par le backend n'accorde aucun accès tant qu'il n'est pas échangé
 * ici contre de vrais tokens via /api/auth/2fa/login-verify.
 */
export default function TwoFactorVerifyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyTwoFactor, isLoading } = useAuth()
  const { tempToken, redirectTo } = (location.state as LocationState) ?? {}

  const [code, setCode]   = useState('')
  const [error, setError] = useState('')

  if (!tempToken) return <Navigate to="/login" replace />

  const handleVerify = async () => {
    setError('')
    if (code.trim().length < 6) {
      setError('Saisissez le code à 6 chiffres, ou l\'un de vos codes de récupération.')
      return
    }
    try {
      const { needsBirthdate } = await verifyTwoFactor(tempToken, code.trim())
      navigate(needsBirthdate ? '/completer-naissance' : (redirectTo ?? '/profil'), { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Code invalide.')
    }
  }

  return (
    <>
      <PageMeta title="Vérification en deux étapes" noIndex />
      <div className="relative min-h-screen overflow-hidden bg-black text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />

        <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
          >
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                <ShieldCheck size={28} className="text-white/70" />
              </div>
            </div>

            <div className="mb-6 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Vérification en deux étapes</h1>
              <p className="mt-2 text-sm text-white/60">
                Saisissez le code généré par votre application d'authentification.
              </p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                >
                  <AlertCircle size={15} className="shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={code}
              onChange={e => { setCode(e.target.value.replace(/[^0-9A-Za-z-]/g, '')); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
              placeholder="123456"
              maxLength={14}
              disabled={isLoading}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-center text-lg tracking-[0.3em] outline-none placeholder:text-white/30 focus:border-white/30 transition-colors disabled:opacity-50"
            />

            <motion.button
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.01 }}
              onClick={handleVerify}
              disabled={isLoading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-medium text-black transition-all hover:bg-white/90 disabled:opacity-60"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Vérifier <ArrowRight className="h-4 w-4" /></>}
            </motion.button>

            <p className="mt-5 text-center text-xs text-white/40">
              Vous pouvez aussi utiliser un code de récupération à usage unique.
            </p>
          </motion.div>
        </div>
      </div>
    </>
  )
}
