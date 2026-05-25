import { useCartStore, selectItemCount, selectTotal } from '../store/cartStore'

export function useCart() {
  const items = useCartStore((s) => s.items)
  const addItem = useCartStore((s) => s.addItem)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const clearCart = useCartStore((s) => s.clearCart)
  const itemCount = useCartStore(selectItemCount)
  const total = useCartStore(selectTotal)
  return { items, addItem, removeItem, updateQuantity, clearCart, itemCount, total }
}
