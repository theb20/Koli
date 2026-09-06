/* ─────────────────────────────────────────────────────────────
   Types partagés du chatbox — le backend (backend/src/routes/chat.ts)
   renvoie ChatAction[]/ChatProduct[] avec exactement cette forme.
───────────────────────────────────────────────────────────── */

export type ChatActionType = 'order' | 'tracking' | 'product' | 'cart' | 'checkout' | 'support' | 'link'

export type ChatAction = {
  type: ChatActionType
  label: string
  target?: string
  id?: string
}

export type ChatProduct = {
  id: string
  name: string
  brand?: string
  image?: string
  price: number
  oldPrice?: number
  rating?: number
  stock?: number
}

export type Message = {
  id: string
  from: 'me' | 'team'
  text: string
  time: string
  actions?: ChatAction[]
  products?: ChatProduct[]
}

export function newMessageId(): string {
  // crypto.randomUUID() est disponible dans tous les contextes sécurisés
  // (https, ce qui couvre la prod) — repli simple pour un environnement de
  // dev/test qui ne l'exposerait pas.
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const now = (): string => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
