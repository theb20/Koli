import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Check, Loader2, Star } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { submitReview } from '../../lib/api'

export function ReviewForm({ productId, onSubmit }: { productId: number; onSubmit: () => void }) {
  const { token, isAuthenticated, user } = useAuth()
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const [hover,  setHover]  = useState(0)
  const [picked, setPicked] = useState(0)
  const [title,  setTitle]  = useState('')
  const [body,   setBody]   = useState('')
  const [sent,   setSent]   = useState(false)
  const [error,  setError]  = useState('')
  const [loading, setLoading] = useState(false)

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="w-14 h-14 rounded-full bg-base flex items-center justify-center">
          <Star size={22} className="text-border" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Connectez-vous pour laisser un avis</p>
          <p className="text-xs text-muted mt-1">Seuls les utilisateurs connectés peuvent publier un avis.</p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="px-5 py-2.5 rounded-xl bg-ink text-white text-sm font-semibold hover:bg-ink/90 transition-colors"
        >
          Se connecter
        </button>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!picked) { setError('Choisissez une note.'); return }
    if (body.trim().length < 10) { setError('Votre commentaire doit faire au moins 10 caractères.'); return }
    setError('')
    setLoading(true)
    try {
      await submitReview({ productId, rating: picked, title: title.trim() || undefined, body: body.trim() }, token!)
      setSent(true)
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] })
      setTimeout(onSubmit, 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la soumission.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 py-10 text-center"
      >
        <div className="w-14 h-14 rounded-full bg-brand-light flex items-center justify-center">
          <Check size={26} className="text-brand" strokeWidth={2.5} />
        </div>
        <p className="text-base font-semibold text-ink">Merci pour votre avis !</p>
        <p className="text-sm text-muted">Il sera publié après validation sous 24h.</p>
      </motion.div>
    )
  }

  const initials = `${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}`.toUpperCase()

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-base border border-border">
        <div className="w-9 h-9 rounded-full bg-ink flex items-center justify-center text-white text-xs font-bold shrink-0">
          {user.avatar
            ? <img src={user.avatar} alt={user.prenom} className="w-full h-full object-cover rounded-full" />
            : initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{user.prenom} {user.nom}</p>
          <p className="text-[11px] text-muted">Votre avis sera publié sous ce nom</p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
          Votre note <span className="text-deal">*</span>
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(i => (
            <button
              key={i} type="button"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setPicked(i)}
              className="transition-transform hover:scale-125 active:scale-95"
            >
              <Star
                size={28}
                className={`transition-colors ${
                  i <= (hover || picked) ? 'text-rating fill-rating' : 'text-border fill-border'
                }`}
              />
            </button>
          ))}
          {picked > 0 && (
            <span className="ml-2 text-sm text-muted">
              {['', 'Mauvais', 'Passable', 'Bien', 'Très bien', 'Excellent'][picked]}
            </span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
          Titre de votre avis
        </label>
        <input
          type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Ex : Très bon rapport qualité-prix"
          maxLength={100}
          className="w-full rounded-xl border border-border bg-base px-4 py-2.5 text-sm text-ink placeholder-muted outline-none focus:border-ink transition"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
          Votre commentaire <span className="text-deal">*</span>
        </label>
        <textarea
          value={body} onChange={e => { setBody(e.target.value); if (error) setError('') }} rows={4}
          placeholder="Décrivez votre expérience : qualité, livraison, utilisation... (min. 10 caractères)"
          maxLength={2000}
          className={`w-full rounded-xl border bg-base px-4 py-2.5 text-sm text-ink placeholder-muted outline-none transition resize-none ${
            error && body.trim().length < 10 ? 'border-deal' : 'border-border focus:border-ink'
          }`}
        />
        <div className="flex items-center justify-between mt-1">
          <span className={`text-[11px] ${body.trim().length < 10 && body.length > 0 ? 'text-deal' : 'text-muted'}`}>
            {body.length}/2000 {body.trim().length < 10 && body.length > 0 ? `(encore ${10 - body.trim().length} car.)` : ''}
          </span>
        </div>
      </div>

      {error && (
        <p className="text-xs text-deal bg-deal-light rounded-xl px-4 py-2.5 flex items-center gap-2">
          ⚠ {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!picked || body.trim().length < 10 || loading}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2
          bg-ink text-white hover:bg-ink/90 active:scale-[0.98]
          disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? 'Publication…' : 'Publier mon avis'}
      </button>
    </form>
  )
}
