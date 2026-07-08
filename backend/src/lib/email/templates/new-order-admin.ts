import { send }       from '../client'
import { baseLayout } from '../layout'
import { subheading, heading, paragraph, divider, ctaButton, metaTable, orderItemsTable } from '../components'
import type { OrderItem } from '../types'

export type NewOrderAdminPayload = {
  orderNumber:     string
  clientNom:       string
  clientTelephone: string
  clientEmail:     string
  items:           OrderItem[]
  total:           number
  paymentMethod:   string
  deliveryMethod:  string
  orderId:         string
}

const PAYMENT_LABELS: Record<string, string> = {
  orange: 'Orange Money',
  mtn:    'MTN Mobile Money',
  wave:   'Wave',
  cash:   'Paiement à la livraison',
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR') + '&nbsp;FCFA'
}

export async function sendNewOrderAdminEmail(to: string, order: NewOrderAdminPayload): Promise<void> {
  const adminUrl = process.env.ADMIN_URL ?? 'https://adminskignas.web.app'

  const html = await baseLayout(`
      ${subheading('Nouvelle commande')}
      ${heading(`💰 ${fmt(order.total)}`)}
      ${paragraph(`Une nouvelle commande vient d'être passée par <strong style="color:#111827">${order.clientNom}</strong>.`)}

      ${divider()}
      ${orderItemsTable(order.items)}

      <div style="margin-top:8px">
        ${metaTable([
          ['Commande', order.orderNumber],
          ['Client', order.clientNom],
          ['Téléphone', order.clientTelephone],
          ['Email', order.clientEmail],
          ['Paiement', PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod],
          ['Livraison', order.deliveryMethod === 'express' ? 'Express · 24h' : 'Standard · 48–72h'],
        ])}
      </div>

      ${ctaButton('Voir la commande', `${adminUrl}/orders/${order.orderId}`)}
    `, `Nouvelle commande ${order.orderNumber} — ${fmt(order.total)}`)

  await send(to, `🛎️ Nouvelle commande ${order.orderNumber} · ${fmt(order.total).replace('&nbsp;', ' ')}`, html)
}
