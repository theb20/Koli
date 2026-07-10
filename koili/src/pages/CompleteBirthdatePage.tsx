import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, AlertCircle, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const MIN_AGE = 18

function computeAge(dateStr: string): number {
  const birth = new Date(dateStr)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const hadBirthday = now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate())
  if (!hadBirthday) age--
  return age
}

export default function CompleteBirthdatePage() {
  const navigate = useNavigate()
  const { user, completeBirthdate, logout } = useAuth()

  const [naissance,  setNaissance]  = useState('')
  const [error,      setError]      = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!naissance) { setError('Veuillez indiquer votre date de naissance.'); return }
    if (computeAge(naissance) < MIN_AGE) {
      setError(`L'accès à Skignas est réservé aux personnes de ${MIN_AGE} ans et plus.`)
      return
    }
    setSubmitting(true)
    try {
      await completeBirthdate(naissance)
      navigate('/profil', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm rounded-3xl border border-white/[0.08] bg-white/[0.06] p-8 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
      >
        <img src="/imgs_dropship/sk_black.png" className="h-10 mx-auto mb-6" alt="Skignas" />

        <h1 className="text-xl font-bold text-center">Encore une étape</h1>
        <p className="text-sm text-white/50 mt-2 text-center leading-relaxed">
          {user?.prenom ? `Bonjour ${user.prenom}, ` : ''}confirmez votre date de naissance pour accéder à votre compte — l'accès est réservé aux personnes majeures.
        </p>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle size={15} className="shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-white/40">
              Date de naissance
            </label>
            <div className="group flex items-center rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 transition-all focus-within:border-violet-500/50 focus-within:bg-white/[0.07] hover:border-white/[0.14]">
              <Calendar className="h-4 w-4 shrink-0 text-white/30 transition-colors group-focus-within:text-violet-400" />
              <input
                type="date"
                value={naissance}
                onChange={e => { setNaissance(e.target.value); setError('') }}
                disabled={submitting}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full bg-transparent px-3 py-[14px] text-sm outline-none placeholder:text-white/30 disabled:opacity-50 [color-scheme:dark]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition disabled:opacity-50"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Continuer'}
          </button>

          <button
            type="button"
            onClick={() => { logout(); navigate('/login') }}
            className="w-full text-xs text-white/35 hover:text-white/60 transition"
          >
            Annuler et se déconnecter
          </button>
        </form>
      </motion.div>
    </div>
  )
}
