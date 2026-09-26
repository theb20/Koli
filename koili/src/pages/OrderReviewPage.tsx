import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, AlertCircle, Star, CheckCircle2, Truck, Package } from 'lucide-react'
import { PageMeta } from '../components/seo/PageMeta'
import { fetchOrderReviewForm, submitOrderReviews } from '../lib/api'

const MIN_CHARS = 10

type Draft = { rating: number; body: string }

function StarInput({ value, onChange, size = 26 }: { value: number; onChange: (n: number) => void; size?: number }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)} onMouseEnter={() => setHover(n)}
          className="p-0.5 transition-transform hover:scale-110">
          <Star size={size} className={n <= shown ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
        </button>
      ))}
    </div>
  )
}

const RATING_LABEL = ['', 'Très décevant', 'Décevant', 'Correct', 'Bien', 'Excellent']

function ReviewBlock({ title, subtitle, image, icon, draft, onChange, placeholder }: {
  title: string; subtitle?: string; image?: string; icon?: React.ReactNode
  draft: Draft; onChange: (d: Draft) => void; placeholder: string
}) {
  const tooShort = draft.rating > 0 && draft.body.trim().length < MIN_CHARS
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 shrink-0 overflow-hidden flex items-center justify-center">
          {image ? <img src={image} alt={title} className="w-full h-full object-cover" /> : icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 line-clamp-2">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <StarInput value={draft.rating} onChange={rating => onChange({ ...draft, rating })} />
        {draft.rating > 0 && <span className="text-sm font-medium text-gray-600">{RATING_LABEL[draft.rating]}</span>}
      </div>
      {draft.rating > 0 && (
        <>
          <textarea value={draft.body} onChange={e => onChange({ ...draft, body: e.target.value })}
            rows={3} maxLength={2000} placeholder={placeholder}
            className="mt-3 w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400" />
          {tooShort && <p className="text-xs text-amber-600 mt-1">Encore {MIN_CHARS - draft.body.trim().length} caractère(s) minimum.</p>}
        </>
      )}
    </div>
  )
}

/**
 * Page "Laisser un avis" — ouverte depuis le lien envoyé à la livraison
 * (e-mail, SMS, notification), sans compte requis. Un avis par produit
 * (affiché sur la fiche produit) + un avis sur la commande (livraison,
 * service — affiché en page d'accueil). Les avis déjà laissés sont
 * pré-remplis et modifiables.
 */
export default function OrderReviewPage() {
  const { token = '' } = useParams<{ token: string }>()
  const qc = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['order-review', token],
    queryFn:  () => fetchOrderReviewForm(token),
    enabled:  !!token,
    retry:    false,
  })
  const form = data?.data

  const [products, setProducts] = useState<Record<number, Draft>>({})
  const [orderDraft, setOrderDraft] = useState<Draft>({ rating: 0, body: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Pré-remplissage avec les avis déjà laissés (retour sur le lien)
  useEffect(() => {
    if (!form) return
    setProducts(Object.fromEntries(form.items.map(i => [i.productId, i.review ?? { rating: 0, body: '' }])))
    setOrderDraft(form.orderReview ?? { rating: 0, body: '' })
  }, [form])

  if (isLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 size={32} className="animate-spin text-gray-300" /></div>
  }
  if (isError || !form) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <PageMeta title="Lien d'avis introuvable" noIndex />
        <AlertCircle size={40} className="text-gray-300" />
        <p className="text-xl text-gray-900">Lien introuvable</p>
        <p className="text-sm text-gray-500 max-w-sm">Ce lien n'est pas valide. Vérifiez le lien reçu après votre livraison.</p>
        <Link to="/" className="mt-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition">Retour à l'accueil</Link>
      </div>
    )
  }

  const filledProducts = Object.entries(products)
    .filter(([, d]) => d.rating > 0)
    .map(([id, d]) => ({ productId: Number(id), rating: d.rating, body: d.body.trim() }))
  const orderFilled = orderDraft.rating > 0
  const incomplete = filledProducts.some(p => p.body.length < MIN_CHARS) || (orderFilled && orderDraft.body.trim().length < MIN_CHARS)
  const nothing = filledProducts.length === 0 && !orderFilled

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      await submitOrderReviews(token, {
        products: filledProducts,
        order: orderFilled ? { rating: orderDraft.rating, body: orderDraft.body.trim() } : undefined,
      })
      qc.invalidateQueries({ queryKey: ['order-review', token] })
      setDone(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur, réessayez.')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
        <PageMeta title="Merci pour votre avis" noIndex />
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center"><CheckCircle2 size={32} className="text-emerald-600" /></div>
        <p className="text-2xl font-bold text-gray-900">Merci {form.clientPrenom} !</p>
        <p className="text-sm text-gray-500 max-w-sm">Votre avis est publié. Il aide les autres clients à bien choisir.</p>
        <div className="flex gap-2 mt-3">
          <button onClick={() => setDone(false)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 transition">Modifier mon avis</button>
          <Link to="/" className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition">Retour à l'accueil</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/70">
      <PageMeta title="Laisser un avis" noIndex />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Commande {form.orderNumber}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">Votre avis, {form.clientPrenom} ?</h1>
          <p className="text-sm text-gray-500 mt-1">Notez les produits reçus et votre expérience avec Skignas. Chaque note est facultative.</p>
        </div>

        {form.items.map(item => (
          <ReviewBlock key={item.productId}
            title={item.name} subtitle="Produit" image={item.image} icon={<Package size={20} className="text-gray-300" />}
            draft={products[item.productId] ?? { rating: 0, body: '' }}
            onChange={d => setProducts(p => ({ ...p, [item.productId]: d }))}
            placeholder="Qualité, conformité à la description, utilisation au quotidien…" />
        ))}

        <ReviewBlock
          title="Votre commande et notre service" subtitle="Livraison, emballage, relation client"
          icon={<Truck size={20} className="text-blue-500" />}
          draft={orderDraft} onChange={setOrderDraft}
          placeholder="Délai de livraison, état du colis, accueil du livreur, suivi…" />

        {error && (
          <div className="flex items-start gap-2 p-4 rounded-xl bg-red-50 border border-red-100">
            <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button onClick={handleSubmit} disabled={saving || nothing || incomplete}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
          {saving && <Loader2 size={16} className="animate-spin" />} Publier mon avis
        </button>
        <p className="text-center text-[11px] text-gray-400">
          Votre avis sera publié avec votre prénom et l'initiale de votre nom, avec la mention « Achat vérifié ».
        </p>
      </div>
    </div>
  )
}
