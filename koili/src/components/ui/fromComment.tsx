import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Star, CheckCircle2, Camera, Search, XCircle, Loader2, LogIn, AlertCircle } from 'lucide-react'
import { ShimmeringText } from './FlipText'
import { useAuth } from '../../contexts/AuthContext'
import { submitReview, fetchProducts } from '../../lib/api'
import { useNavigate } from 'react-router-dom'

/* ─────────────────────────────────────────
   STAR PICKER
───────────────────────────────────────── */
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value

  const labels: Record<number, string> = {
    1: 'Très décevant',
    2: 'Décevant',
    3: 'Correct',
    4: 'Bien',
    5: 'Excellent !',
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-125 active:scale-110"
          >
            <Star
              size={32}
              className={`transition-colors ${
                n <= active ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'
              }`}
            />
          </button>
        ))}
      </div>
      <p className={`text-sm font-medium h-5 transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}>
        {labels[active] ?? ''}
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────
   PRODUCT SEARCH — connecté à l'API
───────────────────────────────────────── */
type ProductOption = { id: number; name: string }

function ProductSearch({
  selected,
  onSelect,
}: {
  selected: ProductOption | null
  onSelect: (p: ProductOption | null) => void
}) {
  const [query,   setQuery]   = useState('')
  const [open,    setOpen]    = useState(false)
  const [results, setResults] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetchProducts({ q: query, limit: 8 })
        setResults(res.data.products.map(p => ({ id: p.id, name: p.name })))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  function select(p: ProductOption) {
    onSelect(p)
    setQuery(p.name)
    setOpen(false)
  }

  function clear() {
    onSelect(null)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-1.5 relative" ref={ref}>
      <label className="text-xs font-semibold text-gray-700">
        Produit concerné <span className="text-red-400">*</span>
      </label>

      <div className="relative">
        {loading
          ? <Loader2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
          : <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
        }
        <input
          type="text"
          value={selected ? selected.name : query}
          placeholder="Tapez le nom d'un produit…"
          onChange={e => { onSelect(null); setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { if (!selected) setOpen(true) }}
          className="w-full pl-9 pr-9 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300"
        />
        {(selected || query) && (
          <button type="button" onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
            <XCircle size={15} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 z-20 border border-gray-100 rounded-xl shadow-lg bg-white overflow-hidden max-h-44 overflow-y-auto divide-y divide-gray-50"
          >
            {results.map(p => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => select(p)}
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-blue-50 hover:text-blue-700 text-gray-700"
                >
                  {p.name}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
        {open && query.length >= 2 && results.length === 0 && !loading && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-gray-400 px-2 py-1"
          >
            Aucun produit trouvé
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─────────────────────────────────────────
   MODAL
───────────────────────────────────────── */
export function CommentModal({ onClose }: { onClose: () => void }) {
  const { user, token, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [rating,    setRating]    = useState(0)
  const [product,   setProduct]   = useState<ProductOption | null>(null)
  const [text,      setText]      = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [submitted, setSubmitted] = useState(false)

  const displayName = user
    ? `${user.prenom ?? ''} ${user.nom ?? ''}`.trim()
    : ''
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const canSubmit = rating > 0 && !!product && text.trim().length >= 10 && !loading

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit || !token || !product) return
    if (text.trim().length < 10) { setError('Minimum 10 caractères.'); return }

    setLoading(true)
    setError('')
    try {
      await submitReview({ productId: product.id, rating, body: text }, token)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi. Réessayez.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        className="relative z-10 w-full sm:max-w-lg bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Laisser un avis</h3>
            <p className="text-xs text-gray-400 mt-0.5">Votre avis aide d'autres acheteurs</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X size={15} className="text-gray-500" />
          </button>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Non connecté ── */}
          {!isAuthenticated ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center gap-5 px-6 py-12"
            >
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                <LogIn size={28} className="text-blue-500" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900">Connexion requise</p>
                <p className="text-sm text-gray-400 mt-1.5 max-xs mx-auto">
                  Vous devez être connecté pour laisser un avis.
                </p>
              </div>
              <button
                onClick={() => { onClose(); navigate('/login') }}
                className="px-8 py-3 bg-gray-900 text-white text-sm font-bold rounded-full hover:bg-gray-700 transition-colors"
              >
                Se connecter
              </button>
            </motion.div>

          /* ── Succès ── */
          ) : submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 px-6 gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">Merci {user?.prenom} !</p>
                <p className="text-sm text-gray-500 mt-1">
                  Votre avis sera publié après vérification.
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-8 py-3 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-700 transition-colors"
              >
                Fermer
              </button>
            </motion.div>

          /* ── Formulaire ── */
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-5 px-6 py-5 max-h-[70vh] overflow-y-auto"
            >
              {/* Auteur connecté */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                  <p className="text-[11px] text-gray-400">Vous publierez sous ce nom</p>
                </div>
              </div>

              {/* Note */}
              <div className="flex flex-col items-center gap-1 py-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                  Note globale <span className="text-red-400">*</span>
                </p>
                <StarPicker value={rating} onChange={setRating} />
              </div>

              {/* Produit */}
              <ProductSearch selected={product} onSelect={setProduct} />

              {/* Commentaire */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Votre avis <span className="text-red-400">*</span>
                  <span className="ml-1 text-gray-400 font-normal">
                    ({text.length}/500
                    {text.length > 0 && text.length < 10 && (
                      <span className="text-red-400"> · encore {10 - text.length} car.</span>
                    )}
                    )
                  </span>
                </label>
                <textarea
                  value={text}
                  onChange={e => { setText(e.target.value.slice(0, 500)); setError('') }}
                  rows={4}
                  placeholder="Partagez votre expérience : qualité du produit, livraison, service client…"
                  className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition-all resize-none placeholder:text-gray-300 leading-relaxed ${
                    text.length > 0 && text.length < 10
                      ? 'border-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                      : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
              </div>

              {/* Photo — futur */}
              <button
                type="button"
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors w-fit"
              >
                <Camera size={14} />
                Ajouter des photos <span className="text-gray-300">(bientôt disponible)</span>
              </button>

              {/* Erreur */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full py-3.5 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  canSubmit
                    ? 'bg-gray-900 text-white hover:bg-gray-700 active:scale-[0.98]'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Envoi en cours…</>
                  : 'Publier mon avis'
                }
              </button>

              <p className="text-center text-[11px] text-gray-400 -mt-1 pb-1">
                Votre avis sera vérifié avant publication · Données confidentielles
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────
   EXPORT — Trigger + Modal
───────────────────────────────────────── */
export function FromComment({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-all group ${className}`}
      >
        <Star size={14} className="fill-amber-400 text-amber-400" />
        <ShimmeringText
          text="Laisser un avis"
          color="currentColor"
          shimmeringColor="#6b7280"
          duration={1.4}
          className="group-hover:[--color:white]"
        />
      </button>

      <AnimatePresence>
        {open && <CommentModal onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  )
}

export default FromComment
