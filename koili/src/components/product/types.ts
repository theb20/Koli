import type { mapApiProduct, ApiReview } from '../../lib/api'

export type Product = ReturnType<typeof mapApiProduct>

export type Review = {
  id: string; author: string; avatar: string; rating: number
  date: string; title: string; body?: string | null; helpful: number
  verified: boolean
}

/** Convertit un ApiReview vers le type Review local */
export function mapReview(r: ApiReview): Review {
  const prenom = r.user?.prenom ?? 'Anonyme'
  const nom    = r.user?.nom ?? ''
  return {
    id:       r.id,
    author:   `${prenom} ${nom ? nom[0] + '.' : ''}`.trim(),
    avatar:   `${prenom[0] ?? ''}${nom[0] ?? ''}`.toUpperCase(),
    rating:   r.rating,
    date:     new Date(r.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    title:    r.title ?? '',
    body:     r.body,
    helpful:  r.helpful,
    verified: r.verified,
  }
}

export const fmt = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + ' FCFA'

export const disc = (p: number, o: number) => Math.round(((o - p) / o) * 100)

export const BADGE_LABEL: Record<string, string> = {
  hot: '🔥 Top vente', new: 'Nouveau', sale: 'Promo', top: '⭐ Top noté',
}
export const BADGE_STYLE: Record<string, string> = {
  hot: 'bg-red-500 text-white',
  new: 'bg-brand text-white',
  sale: 'bg-deal text-white',
  top: 'bg-blue-600 text-white',
}
