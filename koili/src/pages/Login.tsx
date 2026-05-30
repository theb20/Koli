import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowRight, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageMeta } from '../components/seo/PageMeta'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/btnStyle'
import { API_BASE } from '../lib/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const { loginWithGoogle, isLoading, authError } = useAuth()

  const [email,      setEmail]      = useState('')
  const [step,       setStep]       = useState<'email' | 'sent'>('email')
  const [error,      setError]      = useState('')
  const [sending,    setSending]    = useState(false)
  const [googleLoad, setGoogleLoad] = useState(false)

  // Affiche l'erreur Google remontée par AuthContext (ex: CORS, Firebase)
  const displayError = error || authError || ''

  /* ── Continuer avec email — envoie le magic link ──────── */
  const handleContinue = async () => {
    setError('')
    if (!email.trim() || !email.includes('@')) {
      setError('Veuillez saisir une adresse e-mail valide.')
      return
    }
    setSending(true)
    try {
      await fetch(`${API_BASE}/api/auth/magic-link`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      // On affiche toujours "envoyé" même si l'email n'existe pas (sécurité)
    } catch {
      // Erreur réseau — on affiche quand même la confirmation pour ne pas bloquer
    } finally {
      setSending(false)
      setStep('sent')
    }
  }

  /* ── Google ────────────────────────────────────────────── */
  const handleGoogle = async () => {
    setError('')
    setGoogleLoad(true)
    try {
      await loginWithGoogle()
      navigate('/profil')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (!msg.includes('popup-closed') && !msg.includes('cancelled')) {
        setError(msg || 'Erreur lors de la connexion Google.')
      }
    } finally {
      setGoogleLoad(false)
    }
  }

  const busy = isLoading || googleLoad || sending

  return (
    <>
      <PageMeta
        title="Connexion"
        description="Connectez-vous à votre espace Koli."
        path="/login"
        noIndex
      />

      <div className="relative min-h-screen overflow-hidden bg-black text-white">
        {/* Vidéo de fond */}
        <video autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover">
          <source
            src="https://media.istockphoto.com/id/2162665170/fr/vid%C3%A9o/concept-de-vision-robotique-dans-un-entrep%C3%B4t-des-travailleurs-g%C3%A8rent-les-stocks-au-centre.mp4?s=mp4-640x640-is&k=20&c=ADWTTgzfDHE04Yk9RF4AFkNic8ahiSmRMbDMb7lDJLw="
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" />

        <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="lg:w-full relative lg:max-w-md lg:border rounded-2xl lg:border-white/10 lg:bg-white/10 p-8 lg:shadow-2xl lg:backdrop-blur-xl"
          >
            {/* Logo */}
            <img src="/imgs_dropship/logohori_dropship_white.png" className="w-full h-30 mb-4 hidden lg:block" alt="Koli" />
            <div className="flex justify-center items-center">
              <img src="/imgs_dropship/favicon-dropship.png" className="w-30 h-30 mb-4 block lg:hidden" alt="Koli" />
            </div>

            <div className="mb-8 text-center">
              <h1 className="text-3xl font-semibold tracking-tight">Connexion</h1>
              <p className="mt-2 text-sm text-white/70">Accédez à votre espace sécurisé</p>
            </div>

            <AnimatePresence mode="wait">

              {/* ── Étape 1 : saisie de l'email ── */}
              {step === 'email' && (
                <motion.div
                  key="email-step"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Erreur */}
                  <AnimatePresence>
                    {displayError && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                      >
                        <AlertCircle size={15} className="shrink-0" />
                        {displayError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Email */}
                  <div>
                    <label className="mb-2 block text-sm text-white/80">Adresse e-mail</label>
                    <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 focus-within:border-white/30 transition-colors">
                      <Mail className="h-4 w-4 text-white/50 shrink-0" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError('') }}
                        onKeyDown={e => e.key === 'Enter' && handleContinue()}
                        placeholder="vous@exemple.com"
                        disabled={busy}
                        className="w-full bg-transparent px-3 py-4 text-sm outline-none placeholder:text-white/40 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Continuer */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    whileHover={{ scale: 1.01 }}
                    onClick={handleContinue}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-medium text-black transition-all hover:bg-white/90 disabled:opacity-60"
                  >
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <>Continuer <ArrowRight className="h-4 w-4" /></>}
                  </motion.button>

                  {/* Divider */}
                  <div className="relative py-2 flex justify-center text-xs uppercase">
                    <span className="bg-transparent px-2 text-white/50">ou continuer avec</span>
                  </div>

                  {/* Google */}
                  <Button
                    text={googleLoad ? 'Connexion...' : 'Google'}
                    loading={googleLoad}
                    onClick={handleGoogle}
                  />
                </motion.div>
              )}

              {/* ── Étape 2 : email envoyé / confirmation ── */}
              {step === 'sent' && (
                <motion.div
                  key="sent-step"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-5 text-center"
                >
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                      <CheckCircle size={32} className="text-green-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Vérifiez votre boîte mail</h3>
                    <p className="text-sm text-white/60">
                      Si un compte existe pour <span className="text-white font-medium">{email}</span>,
                      vous recevrez un lien de connexion sous peu.
                    </p>
                  </div>
                  <p className="text-xs text-white/40">
                    Pas reçu ?{' '}
                    <button onClick={() => setStep('email')} className="text-white/70 hover:text-white underline transition">
                      Réessayer
                    </button>
                  </p>
                  {/* Proposer Google en alternative */}
                  <div className="pt-2">
                    <p className="text-xs text-white/40 mb-3">Ou connectez-vous instantanément avec</p>
                    <Button
                      text={googleLoad ? 'Connexion...' : 'Google'}
                      loading={googleLoad}
                      onClick={handleGoogle}
                    />
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-white/60">
              Pas encore de compte ?{' '}
              <button onClick={() => navigate('/register')} className="font-medium text-white transition hover:underline">
                S'inscrire gratuitement →
              </button>
            </div>

            {/* Liens légaux */}
            <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-white/30">
              <a href="/cgu"     target="_blank" rel="noreferrer" className="hover:text-white/60 transition-colors">CGU</a>
              <span>·</span>
              <a href="/privacy" target="_blank" rel="noreferrer" className="hover:text-white/60 transition-colors">Confidentialité</a>
              <span>·</span>
              <a href="/legal"   target="_blank" rel="noreferrer" className="hover:text-white/60 transition-colors">Mentions légales</a>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  )
}
