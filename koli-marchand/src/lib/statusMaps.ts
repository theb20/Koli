import type {
  CustomerSegment,
  OrderPaymentMethod,
  OrderStatus,
  PaymentMethod,
  PayoutStatus,
  ProductStatus,
  PromotionStatus,
} from '@/types'

/**
 * Couleurs de pastille — alignées sur la charte Skignas Marchand :
 * vert = livré/versé, bleu = expédié, orange = en préparation/en cours,
 * rouge = annulé/rupture, gris = brouillon.
 */
export type BadgeTone = 'green' | 'blue' | 'orange' | 'red' | 'gray'

interface StatusEntry {
  label: string
  tone: BadgeTone
}

export const orderStatusMap: Record<OrderStatus, StatusEntry> = {
  pending: { label: 'En attente', tone: 'orange' },
  confirmed: { label: 'Confirmée', tone: 'blue' },
  processing: { label: 'En préparation', tone: 'orange' },
  shipped: { label: 'Expédiée', tone: 'blue' },
  delivered: { label: 'Livrée', tone: 'green' },
  cancelled: { label: 'Annulée', tone: 'red' },
  refunded: { label: 'Remboursée', tone: 'gray' },
}

export const productStatusMap: Record<ProductStatus, StatusEntry> = {
  online: { label: 'En ligne', tone: 'green' },
  draft: { label: 'Brouillon', tone: 'gray' },
  out_of_stock: { label: 'Rupture', tone: 'red' },
}

export const payoutStatusMap: Record<PayoutStatus, StatusEntry> = {
  pending: { label: 'En attente', tone: 'orange' },
  paid: { label: 'Versé', tone: 'green' },
  failed: { label: 'Échoué', tone: 'red' },
}

export const promotionStatusMap: Record<PromotionStatus, StatusEntry> = {
  active: { label: 'Active', tone: 'green' },
  scheduled: { label: 'Programmée', tone: 'blue' },
  expired: { label: 'Expirée', tone: 'gray' },
  draft: { label: 'Brouillon', tone: 'gray' },
}

export const customerSegmentMap: Record<CustomerSegment, StatusEntry> = {
  new: { label: 'Nouveau', tone: 'blue' },
  regular: { label: 'Régulier', tone: 'gray' },
  vip: { label: 'VIP', tone: 'green' },
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  mtn_money: 'MTN Money',
  card: 'Carte bancaire',
  cash_on_delivery: 'Paiement à la livraison',
}

export const orderPaymentMethodLabels: Record<OrderPaymentMethod, string> = {
  online: 'Paiement en ligne',
  cash: 'Paiement à la livraison',
}

export const badgeToneClasses: Record<BadgeTone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  blue: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
  orange: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
  gray: 'bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-200',
}
