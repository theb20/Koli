import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, ArrowRight, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { PageMeta } from '../components/seo/PageMeta'
import { API_BASE } from '../lib/api'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')

  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [showPwd,    setShowPwd]    = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [done,       setDone]       = useState(false)

  if (!token) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black text-white flex items-center justify-center p-6">
        <PageMeta title="Lien invalide" noIndex />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
        <div className="relative z-10 w-full max-w-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto">
            <AlertCircle size={28} className="text-red-400" />
          </div>
          <h1 className="text-xl font-semibold">Lien invalide</h1>
          <Link to="/login" className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition">
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async () => {
    setError('')
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Erreur')
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageMeta title="Définir un mot de passe" noIndex />
      <div className="relative min-h-screen overflow-hidden bg-black text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />

        <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
          >
            <AnimatePresence mode="wait">
              {!done ? (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                      <Lock size={28} className="text-white/70" />
                    </div>
                  </div>

                  <div className="mb-6 text-center">
                    <h1 className="text-2xl font-semibold tracking-tight">Définir votre mot de passe</h1>
                    <p className="mt-2 text-sm text-white/60">Choisissez un mot de passe pour votre compte Skignas.</p>
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

                  <div className="space-y-3">
                    <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 focus-within:border-white/30 transition-colors">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError('') }}
                        placeholder="Minimum 8 caractères"
                        disabled={loading}
                        className="w-full bg-transparent px-1 py-4 text-sm outline-none placeholder:text-white/40 disabled:opacity-50"
                      />
                      <button onClick={() => setShowPwd(v => !v)} className="text-white/50 hover:text-white/80 transition-colors">
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      placeholder="Confirmez le mot de passe"
                      disabled={loading}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm outline-none placeholder:text-white/40 focus:border-white/30 transition-colors disabled:opacity-50"
                    />
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    whileHover={{ scale: 1.01 }}
                    onClick={handleSubmit}
                    disabled={loading}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-medium text-black transition-all hover:bg-white/90 disabled:opacity-60"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <>Valider <ArrowRight className="h-4 w-4" /></>}
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto">
                    <CheckCircle size={32} className="text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Mot de passe défini !</h2>
                    <p className="text-sm text-white/50 mt-1">Redirection vers la connexion…</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </>
  )
}
