import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, User, Calendar, ArrowRight, Check, Loader2, AlertCircle, CheckCircle, Gift } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/ui/btnStyle'
import CardUniverse from '../components/ui/Card-universe'
import { PageMeta } from '../components/seo/PageMeta'
import { API_BASE } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

const MIN_AGE = 18

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 16 },
  animate:    { opacity: 1, y: 0  },
  transition: { duration: 0.5, delay },
})

/* ── Utilitaire : "Jean Marie Dupont" → { prenom: "Jean", nom: "Marie Dupont" } */
function splitName(fullName: string): { prenom: string; nom: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { prenom: parts[0], nom: parts[0] }
  return { prenom: parts[0], nom: parts.slice(1).join(' ') }
}

function computeAge(dateStr: string): number {
  const birth = new Date(dateStr)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const hadBirthday = now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate())
  if (!hadBirthday) age--
  return age
}

export default function SignupPage() {
  const navigate = useNavigate()
  const { loginWithGoogle } = useAuth()
  const [searchParams] = useSearchParams()

  const [nomComplet,   setNomComplet]   = useState('')
  const [email,        setEmail]        = useState('')
  const [naissance,    setNaissance]    = useState('')
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') ?? '')
  const [agreed,     setAgreed]     = useState(false)
  const [error,      setError]      = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleLoad, setGoogleLoad] = useState(false)
  const [sent,       setSent]       = useState(false)   // état "email envoyé"

  const busy = submitting || googleLoad

  /* ── Validation ────────────────────────────────────────── */
  const validate = (): string => {
    if (!nomComplet.trim() || nomComplet.trim().length < 2) return 'Veuillez saisir votre nom complet.'
    if (!email.trim() || !email.includes('@'))              return 'Adresse e-mail invalide.'
    if (!naissance)                                          return 'Veuillez indiquer votre date de naissance.'
    if (computeAge(naissance) < MIN_AGE)                     return `Vous devez avoir au moins ${MIN_AGE} ans pour créer un compte.`
    if (!agreed)                                            return 'Vous devez accepter les conditions d\'utilisation.'
    return ''
  }

  /* ── Inscription sans mot de passe ─────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setSubmitting(true)

    const { prenom, nom } = splitName(nomComplet)

    try {
      const res  = await fetch(`${API_BASE}/api/auth/register`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({
          prenom, nom, email: email.trim().toLowerCase(), naissance,
          referralCode: referralCode.trim() || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message ?? 'Erreur lors de la création du compte.')
        return
      }

      // Inscription sans mot de passe → magic link envoyé → afficher écran "vérifiez"
      setSent(true)
    } catch {
      setError('Impossible de contacter le serveur. Vérifiez votre connexion.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Google ────────────────────────────────────────────── */
  const handleGoogle = async () => {
    if (!agreed) { setError('Vous devez accepter les conditions d\'utilisation pour continuer.'); return }
    setError('')
    setGoogleLoad(true)
    try {
      // Passe par AuthContext (pas de localStorage direct ici) — met à jour
      // le state React ET la persistance en un seul endroit, cohérent avec
      // Login.tsx.
      const { needsBirthdate } = await loginWithGoogle(referralCode.trim() || undefined)
      navigate(needsBirthdate ? '/completer-naissance' : '/profil')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (!msg.includes('popup-closed') && !msg.includes('cancelled')) {
        setError(msg || 'Erreur lors de la connexion Google.')
      }
    } finally {
      setGoogleLoad(false)
    }
  }

  /* ── Écran "email envoyé" ────────────────────────────── */
  if (sent) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black text-white flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-sm text-center space-y-6"
        >
          <img src="/imgs_dropship/skignas_white.png" className="h-10 mx-auto mb-2" alt="Koli" />

          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 18 }}
            className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto"
          >
            <CheckCircle size={40} className="text-green-400" />
          </motion.div>

          <div>
            <h2 className="text-xl font-bold">Compte créé ! 🎉</h2>
            <p className="text-sm text-white/55 mt-2 leading-relaxed">
              Un lien de connexion a été envoyé à<br />
              <strong className="text-white">{email}</strong>.<br />
              Cliquez sur le lien pour accéder à votre compte.
            </p>
          </div>

          <p className="text-xs text-white/35">
            Pas reçu ?{' '}
            <button
              onClick={() => { setSent(false) }}
              className="text-white/60 underline hover:text-white transition"
            >
              Modifier l'email
            </button>
          </p>

          <button
            onClick={() => navigate('/login')}
            className="w-full py-3.5 rounded-2xl border border-white/10 text-sm font-medium text-white/70 hover:text-white hover:border-white/30 transition"
          >
            Retour à la connexion
          </button>
        </motion.div>
      </div>
    )
  }

  /* ── Formulaire principal ────────────────────────────── */
  return (
    <>
      <PageMeta
        title="Créer un compte"
        description="Rejoignez Koli gratuitement. Accédez à des milliers de produits premium."
        path="/register"
        noIndex
      />

      <div className="relative min-h-screen overflow-hidden bg-black text-white">

        {/* Image de fond */}
        <img src="/wall/wall_login.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/75 backdrop-blur-[8px]" />

        {/* Orbes animés */}
        <motion.div animate={{ x: [0, 50, 0], y: [0, -40, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-[8%] top-[20%] h-[520px] w-[520px] rounded-full bg-blue-700/20 blur-[130px]" />
        <motion.div animate={{ x: [0, -40, 0], y: [0, 35, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[8%] right-[8%] h-[440px] w-[440px] rounded-full bg-blue-600/15 blur-[130px]" />

        <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-8">
          <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1fr_430px] lg:items-center">

            {/* ── Colonne gauche (desktop) ── */}
            <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.85 }}
              className="hidden lg:flex lg:flex-col">
              <div className="w-90 h-20 flex items-center justify-center">
                <img src="/imgs_dropship/skignas_white.png" className="mb-12 w-auto h-auto object-contain" alt="Koli" />
              </div>
              <h2 className="text-[1.9rem] leading-[1.1] tracking-tight">
                Achetez vos produits
                <span className="block bg-gradient-to-r from-blue-400 via-green-400 to-blue-400 bg-clip-text text-transparent">
                  simplement
                </span>
                et recevez-les en quelques jours
              </h2>
              <p className="mt-5 max-w-sm text-lg leading-relaxed text-white/55">
                Plus de <span className="font-semibold text-white/90">12&nbsp;000</span> clients
                font confiance à Koli pour leurs achats quotidiens.
              </p>
              <CardUniverse
                title="Pourquoi nous choisir"
                items={[
                  { text: 'Navigation simple et rapide' },
                  { text: 'Livraison en quelques jours' },
                  { text: 'Prix compétitifs toute l\'année' },
                  { text: 'Support client réactif 24/7' },
                  { text: 'Paiement sécurisé et fiable' },
                ]}
                description="Une expérience d'achat pensée pour être simple, rapide et efficace."
                buttonText="En savoir plus"
                onClick={() => navigate('/cgu')}
              />
              <motion.div {...fadeUp(1.0)} className="mt-10 flex items-center gap-4">
                <div className="flex -space-x-2.5">
                  {[
                    'https://icon2.cleanpng.com/20180803/ubx/5ba055fe0b3b79a8f55892cc8186c6b6.webp',
                    'https://cdn.worldvectorlogo.com/logos/zara-2.svg',
                    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT2_7EeeGsOoVp5cSfWpyU9dhBuz71c-kNjZw&s',
                    'https://upload.wikimedia.org/wikipedia/commons/e/e8/Normal_logo_%28profile_picture%29.jpg',
                  ].map((src, i) => (
                    <img key={i} src={src} alt="" className="h-9 w-9 rounded-full border-2 border-black object-cover shadow-lg" />
                  ))}
                </div>
                <p className="text-sm text-white/50">
                  <span className="font-semibold text-white">+500</span> Magasins actifs
                </p>
              </motion.div>
            </motion.div>

            {/* ── Formulaire (droite) ── */}
            <motion.div
              initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }}
              className="relative w-full rounded-3xl border border-white/[0.08] bg-white/[0.06] p-8 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
            >
              <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/[0.07] via-transparent to-blue-600/[0.07]" />

              {/* Logo mobile */}
              <div className="mb-6 flex justify-center lg:hidden">
                <img src="/imgs_dropship/favicon-dropship.png" className="h-16 w-16 drop-shadow-2xl" alt="Koli" />
              </div>

              <motion.div {...fadeUp(0.2)} className="mb-7">
                <h1 className="text-[1.75rem] font-bold tracking-tight">Créer votre compte</h1>
                <p className="mt-1 text-sm text-white/45">Gratuit · Aucune carte bancaire requise</p>
              </motion.div>

              {/* Erreur */}
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

              <form onSubmit={handleSubmit} noValidate className="space-y-4">

                {/* Nom complet */}
                <motion.div {...fadeUp(0.30)}>
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-white/40">
                    Nom complet
                  </label>
                  <div className="group flex items-center rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 transition-all focus-within:border-violet-500/50 focus-within:bg-white/[0.07] hover:border-white/[0.14]">
                    <User className="h-4 w-4 shrink-0 text-white/30 transition-colors group-focus-within:text-violet-400" />
                    <input
                      type="text"
                      value={nomComplet}
                      onChange={e => { setNomComplet(e.target.value); setError('') }}
                      placeholder="Jean Dupont"
                      disabled={busy}
                      autoComplete="name"
                      className="w-full bg-transparent px-3 py-[14px] text-sm outline-none placeholder:text-white/30 disabled:opacity-50"
                    />
                  </div>
                </motion.div>

                {/* Email */}
                <motion.div {...fadeUp(0.38)}>
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-white/40">
                    Adresse e-mail
                  </label>
                  <div className="group flex items-center rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 transition-all focus-within:border-violet-500/50 focus-within:bg-white/[0.07] hover:border-white/[0.14]">
                    <Mail className="h-4 w-4 shrink-0 text-white/30 transition-colors group-focus-within:text-violet-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      placeholder="vous@exemple.com"
                      disabled={busy}
                      autoComplete="email"
                      className="w-full bg-transparent px-3 py-[14px] text-sm outline-none placeholder:text-white/30 disabled:opacity-50"
                    />
                  </div>
                </motion.div>

                {/* Date de naissance */}
                <motion.div {...fadeUp(0.41)}>
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-white/40">
                    Date de naissance
                  </label>
                  <div className="group flex items-center rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 transition-all focus-within:border-violet-500/50 focus-within:bg-white/[0.07] hover:border-white/[0.14]">
                    <Calendar className="h-4 w-4 shrink-0 text-white/30 transition-colors group-focus-within:text-violet-400" />
                    <input
                      type="date"
                      value={naissance}
                      onChange={e => { setNaissance(e.target.value); setError('') }}
                      disabled={busy}
                      max={new Date().toISOString().slice(0, 10)}
                      className="w-full bg-transparent px-3 py-[14px] text-sm outline-none placeholder:text-white/30 disabled:opacity-50 [color-scheme:dark]"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-white/30">Vous devez avoir 18 ans ou plus pour créer un compte.</p>
                </motion.div>

                {/* Code de parrainage (optionnel) */}
                <motion.div {...fadeUp(0.43)}>
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-white/40">
                    Code de parrainage <span className="normal-case text-white/25">(optionnel)</span>
                  </label>
                  <div className="group flex items-center rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 transition-all focus-within:border-violet-500/50 focus-within:bg-white/[0.07] hover:border-white/[0.14]">
                    <Gift className="h-4 w-4 shrink-0 text-white/30 transition-colors group-focus-within:text-violet-400" />
                    <input
                      type="text"
                      value={referralCode}
                      onChange={e => setReferralCode(e.target.value)}
                      placeholder="SKIGNAS-XXXXXX"
                      disabled={busy}
                      className="w-full bg-transparent px-3 py-[14px] text-sm outline-none placeholder:text-white/30 disabled:opacity-50 uppercase"
                    />
                  </div>
                </motion.div>

                {/* CGU */}
                <motion.div {...fadeUp(0.44)} className="flex items-start gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setAgreed(v => !v); setError('') }}
                    className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
                      agreed ? 'border-violet-500 bg-violet-500' : 'border-white/20 bg-white/5 hover:border-white/40'
                    }`}
                  >
                    {agreed && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
                        <Check className="h-2.5 w-2.5 text-white" />
                      </motion.div>
                    )}
                  </button>
                  <p className="text-xs leading-relaxed text-white/40">
                    J'accepte les{' '}
                    <a href="/cgu" target="_blank" rel="noreferrer" className="text-white/70 underline underline-offset-2 hover:text-white transition-colors">
                      conditions d'utilisation
                    </a>{' '}
                    et la{' '}
                    <a href="/privacy" target="_blank" rel="noreferrer" className="text-white/70 underline underline-offset-2 hover:text-white transition-colors">
                      politique de confidentialité
                    </a>
                  </p>
                </motion.div>

                {/* Bouton principal */}
                <motion.div {...fadeUp(0.50)}>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.980 }}
                    disabled={busy}
                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-blue-600 py-[15px] text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-shadow hover:shadow-blue-600/45 disabled:opacity-60"
                  >
                    {submitting
                      ? <Loader2 size={16} className="animate-spin" />
                      : <>
                          <span className="relative z-10">Créer mon compte</span>
                          <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                          <motion.span aria-hidden className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                            animate={{ x: ['-110%', '210%'] }} transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 3.5, ease: 'easeInOut' }} />
                        </>
                    }
                  </motion.button>
                </motion.div>

                {/* Divider */}
                <motion.div {...fadeUp(0.55)} className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/[0.07]" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase tracking-widest">
                    <span className="bg-transparent px-3 text-white/30">ou s'inscrire avec</span>
                  </div>
                </motion.div>

                {/* Google */}
                <motion.div {...fadeUp(0.60)}>
                  <Button
                    text={googleLoad ? 'Connexion...' : 'Google'}
                    loading={googleLoad}
                    onClick={handleGoogle}
                  />
                </motion.div>
              </form>

              {/* Footer */}
              <motion.div {...fadeUp(0.66)} className="mt-7 text-center text-[13px] text-white/40">
                Déjà un compte ?{' '}
                <button onClick={() => navigate('/login')} className="font-medium text-white transition-opacity hover:opacity-75">
                  Se connecter →
                </button>
              </motion.div>
            </motion.div>

          </div>
        </div>
      </div>
    </>
  )
}
