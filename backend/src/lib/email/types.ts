/* ─── Shared email types ─────────────────────────────────────── */

export interface OrderItem {
  name:  string
  qty:   number
  price: number
}

export interface OrderConfirmationPayload {
  orderNumber:     string
  prenom:          string
  items:           OrderItem[]
  total:           number
  shippingCost?:   number
  promoDiscount?:  number
  subtotal?:       number
  /** Option "Assistance technique" — somme des lignes où elle a été choisie */
  assistanceTotal?: number
  paymentMethod:   string
  deliveryMethod:  string
}
