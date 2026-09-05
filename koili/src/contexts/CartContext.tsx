import {
  createContext, useContext, useReducer, useEffect, useRef,
  useCallback, type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import {
  fetchCart, addToCartApi, updateCartQtyApi, removeFromCartApi, clearCartApi, mergeCartApi,
  type ApiCartItem,
} from '../lib/api'
import { registerPurgeHandler } from '../lib/sessionPurge'

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */
export type CartItem = {
  productId: number
  name: string
  brand: string
  price: number
  oldPrice?: number
  image: string   // première image du produit
  qty: number
  color?: string  // hex couleur choisie
  stock?: number  // stock disponible au moment de l'ajout
}

type CartState = {
  items: CartItem[]
  isOpen: boolean
}

type CartAction =
  | { type: 'ADD';        item: Omit<CartItem, 'qty'>; qty?: number }
  | { type: 'REMOVE';     productId: number }
  | { type: 'UPDATE_QTY'; productId: number; qty: number }
  | { type: 'CLEAR' }
  | { type: 'HYDRATE';    items: CartItem[] }
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'TOGGLE' }

/** ApiCartItem (serveur) → CartItem (shape locale utilisée par toute l'app). */
function fromApiCartItem(i: ApiCartItem): CartItem {
  const p = i.product
  return {
    productId: i.productId,
    name:      p.name,
    brand:     p.brand,
    price:     p.price,
    oldPrice:  p.oldPrice ?? undefined,
    image:     p.images?.[0]?.url ?? '',
    qty:       i.qty,
    color:     i.color ?? undefined,
    stock:     p.stock,
  }
}

/* ═══════════════════════════════════════════════════════════════
   REDUCER
═══════════════════════════════════════════════════════════════ */
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {

    case 'ADD': {
      const qty = action.qty ?? 1
      const maxStock = (action.item.stock != null && action.item.stock > 0) ? action.item.stock : undefined
      const clamp = (n: number) => maxStock ? Math.min(n, maxStock) : n
      const exists = state.items.find(i => i.productId === action.item.productId)
      const items = exists
        ? state.items.map(i =>
            i.productId === action.item.productId
              ? { ...i, qty: clamp(i.qty + qty), stock: action.item.stock ?? i.stock }
              : i
          )
        : [...state.items, { ...action.item, qty: clamp(qty) }]
      return { ...state, items }
    }

    case 'REMOVE':
      return { ...state, items: state.items.filter(i => i.productId !== action.productId) }

    case 'UPDATE_QTY':
      if (action.qty <= 0) {
        return { ...state, items: state.items.filter(i => i.productId !== action.productId) }
      }
      return {
        ...state,
        items: state.items.map(i =>
          i.productId === action.productId ? { ...i, qty: action.qty } : i
        ),
      }

    case 'CLEAR':
      return { ...state, items: [] }

    case 'HYDRATE':
      return { ...state, items: action.items }

    case 'OPEN':
      return { ...state, isOpen: true }

    case 'CLOSE':
      return { ...state, isOpen: false }

    case 'TOGGLE':
      return { ...state, isOpen: !state.isOpen }

    default:
      return state
  }
}

/* ═══════════════════════════════════════════════════════════════
   INITIAL STATE — hydraté depuis localStorage
═══════════════════════════════════════════════════════════════ */
function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem('koli_cart')
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

const INITIAL: CartState = {
  items: loadCart(),
  isOpen: false,
}

/* ═══════════════════════════════════════════════════════════════
   CONTEXT
═══════════════════════════════════════════════════════════════ */
type CartContextValue = {
  items: CartItem[]
  isOpen: boolean
  totalItems: number
  totalPrice: number
  addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => void
  removeItem: (productId: number) => void
  updateQty: (productId: number, qty: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

/* ═══════════════════════════════════════════════════════════════
   PROVIDER
═══════════════════════════════════════════════════════════════ */
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, INITIAL)
  const { token } = useAuth()

  /* Persistance locale — uniquement pour un invité. Une fois connecté, le
     serveur est la source de vérité (voir effet de connexion ci-dessous) ;
     continuer à écrire dans localStorage risquerait de mélanger le panier
     de deux comptes différents sur le même navigateur. */
  useEffect(() => {
    if (token) return
    localStorage.setItem('koli_cart', JSON.stringify(state.items))
  }, [state.items, token])

  /* Connexion / déconnexion — un utilisateur connecté retrouve son panier
     serveur à chaque reconnexion (n'importe quel appareil), en fusionnant
     d'abord ce qu'il avait localement en tant qu'invité, s'il y en avait. */
  // Initialisé à `null` (jamais à `token`) : si l'utilisateur est déjà
  // connecté au chargement de la page (token restauré depuis localStorage
  // par AuthProvider), on veut quand même hydrater depuis le serveur au
  // premier rendu, pas seulement sur une transition déconnecté→connecté.
  const prevTokenRef = useRef<string | null>(null)
  useEffect(() => {
    const prevToken = prevTokenRef.current
    prevTokenRef.current = token

    if (token && !prevToken) {
      // Connexion — fusionne le panier invité (s'il existe) puis hydrate
      // depuis le panier serveur, qui devient la source de vérité.
      (async () => {
        try {
          const guestItems = loadCart()
          const res = guestItems.length > 0
            ? await mergeCartApi(guestItems.map(i => ({ productId: i.productId, qty: i.qty, color: i.color })), token)
            : await fetchCart(token)
          localStorage.removeItem('koli_cart')
          dispatch({ type: 'HYDRATE', items: res.data.map(fromApiCartItem) })
        } catch {
          // Échec réseau — le panier invité local reste affiché tel quel,
          // la prochaine reconnexion réussie refera la synchronisation.
        }
      })()
    } else if (!token && prevToken) {
      // Déconnexion — le panier affiché appartenait au compte, pas à
      // l'appareil : on repart d'un panier invité vide plutôt que de
      // laisser le prochain visiteur du même navigateur le voir.
      dispatch({ type: 'CLEAR' })
      localStorage.removeItem('koli_cart')
    }
  }, [token])

  /* Purge synchrone et déterministe, appelée directement par logout()
     (voir lib/sessionPurge.ts) — garantit qu'aucun article de l'ancien
     compte ne reste visible, sans dépendre du prochain rendu de l'effet
     ci-dessus. Ce dernier reste utile pour le cas d'une session expirée
     silencieusement (refresh token invalide, sans clic explicite sur
     "déconnexion") — les deux chemins convergent vers le même résultat. */
  useEffect(() => registerPurgeHandler(() => {
    dispatch({ type: 'CLEAR' })
    localStorage.removeItem('koli_cart')
  }), [])

  /* Dérivés */
  const totalItems = state.items.reduce((s, i) => s + i.qty, 0)
  const totalPrice = state.items.reduce((s, i) => s + i.price * i.qty, 0)

  /* Actions mémoïsées — mise à jour locale immédiate (réactivité UI), puis
     miroir vers le serveur si connecté (non bloquant : un échec réseau ne
     doit jamais empêcher d'ajouter un article au panier localement ; la
     prochaine connexion/hydratation resynchronisera). */
  const addItem = useCallback((item: Omit<CartItem, 'qty'>, qty?: number) => {
    dispatch({ type: 'ADD', item, qty })
    if (token) addToCartApi(item.productId, qty ?? 1, item.color, token).catch(() => {})
  }, [token])

  const removeItem = useCallback((productId: number) => {
    dispatch({ type: 'REMOVE', productId })
    if (token) removeFromCartApi(productId, token).catch(() => {})
  }, [token])

  const updateQty = useCallback((productId: number, qty: number) => {
    dispatch({ type: 'UPDATE_QTY', productId, qty })
    if (token) updateCartQtyApi(productId, qty, token).catch(() => {})
  }, [token])

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' })
    if (token) clearCartApi(token).catch(() => {})
  }, [token])

  const openCart   = useCallback(() => dispatch({ type: 'OPEN' }), [])
  const closeCart  = useCallback(() => dispatch({ type: 'CLOSE' }), [])
  const toggleCart = useCallback(() => dispatch({ type: 'TOGGLE' }), [])

  return (
    <CartContext.Provider value={{
      items: state.items, isOpen: state.isOpen,
      totalItems, totalPrice,
      addItem, removeItem, updateQty, clearCart,
      openCart, closeCart, toggleCart,
    }}>
      {children}
    </CartContext.Provider>
  )
}

/* ═══════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════ */
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}

/* ─── Helpers ─── */
export const fmtCart = (n: number) =>
  Math.round(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'
