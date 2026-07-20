import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { PageMeta } from '../components/seo/PageMeta'

export default function MagicLoginPage() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const { loginWithMagicToken } = useAuth()

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setStatus('error')
      return
    }

    const isNew = params.get('new') === '1'

    loginWithMagicToken(token)
      .then(({ needsBirthdate }) => {
        setStatus('success')
        const dest = needsBirthdate ? '/completer-naissance' : (isNew ? '/onboarding' : '/profil')
        setTimeout(() => navigate(dest, { replace: true }), 1500)
      })
      .catch(() => setStatus('error'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white flex items-center justify-center p-6">
      <PageMeta title="Connexion par lien magique" noIndex />
      {/* Fond décoratif */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm text-center space-y-6"
      >
        {/* Logo */}
        <img
          src='/imgs_dropship/sk_black.png'
          className="h-10 mx-auto mb-2"
          alt="Skignas"
        />

        {status === 'loading' && (
          <>
            <div className="w-20 h-20 rounded-full bg-white/10 border border-white/10 flex items-center justify-center mx-auto">
              <Loader2 size={36} className="animate-spin text-white/60" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Connexion en cours…</h2>
              <p className="text-sm text-white/50 mt-1">Vérification de votre lien</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-4"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto">
              <CheckCircle size={40} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Connecté !</h2>
              <p className="text-sm text-white/50 mt-1">Redirection vers votre profil…</p>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-5"
          >
            <div className="w-20 h-20 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto">
              <AlertCircle size={40} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Lien invalide ou expiré</h2>
              <p className="text-sm text-white/50 mt-1">
                Ce lien n'est valable que 15 minutes.<br />
                Demandez-en un nouveau.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition"
            >
              Retour à la connexion
            </Link>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
