import {
  createContext, useContext, useReducer, useEffect,
  useCallback, type ReactNode,
} from 'react'

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
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'TOGGLE' }

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

  /* Persistance */
  useEffect(() => {
    localStorage.setItem('koli_cart', JSON.stringify(state.items))
  }, [state.items])

  /* Dérivés */
  const totalItems = state.items.reduce((s, i) => s + i.qty, 0)
  const totalPrice = state.items.reduce((s, i) => s + i.price * i.qty, 0)

  /* Actions mémoïsées */
  const addItem    = useCallback((item: Omit<CartItem, 'qty'>, qty?: number) => dispatch({ type: 'ADD', item, qty }), [])
  const removeItem = useCallback((productId: number) => dispatch({ type: 'REMOVE', productId }), [])
  const updateQty  = useCallback((productId: number, qty: number) => dispatch({ type: 'UPDATE_QTY', productId, qty }), [])
  const clearCart  = useCallback(() => dispatch({ type: 'CLEAR' }), [])
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
  Math.round(n / 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'
