import { send }       from '../client'
import { baseLayout } from '../layout'
import { heading, paragraph, divider, ctaButton, statusTag, highlightBox, metaTable, orderItemsTable } from '../components'
import { OrderConfirmationPayload } from '../types'

const PAYMENT_LABELS: Record<string, string> = {
  orange: 'Orange Money',
  mtn:    'MTN Mobile Money',
  wave:   'Wave',
  cash:   'Paiement à la livraison',
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR') + '&nbsp;FCFA'
}

export async function sendOrderConfirmationEmail(to: string, order: OrderConfirmationPayload): Promise<void> {
  const frontUrl      = process.env.FRONTEND_URL ?? 'https://skignas.com'
  const paymentLabel  = PAYMENT_LABELS[order.paymentMethod]  ?? order.paymentMethod
  const deliveryLabel = order.deliveryMethod === 'express' ? 'Express · 24h' : 'Standard · 48–72h'
  const sub           = order.subtotal      ?? order.items.reduce((s, i) => s + i.price * i.qty, 0)
  const shipping      = order.shippingCost  ?? 0
  const promo         = order.promoDiscount ?? 0

  const summaryRows: Array<[string, string]> = [
    ['Sous-total', fmt(sub)],
    ...(promo > 0 ? [['Promo', `<span style="color:#059669">−${fmt(promo)}</span>`] as [string, string]] : []),
    ['Livraison', shipping === 0 ? '<span style="color:#059669">Gratuite</span>' : fmt(shipping)],
  ]

  const html = await baseLayout(`
      ${statusTag('Commande reçue', '#059669', '#ecfdf5')}
      ${heading(`Merci, ${order.prenom} !`)}
      ${paragraph(`Votre commande <strong style="color:#0421ff">${order.orderNumber}</strong> a bien été reçue et est en cours de traitement.`)}

      ${divider()}
      ${orderItemsTable(order.items)}

      <div style="margin-top:8px">
        ${metaTable(summaryRows)}
      </div>

      ${highlightBox(`
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
          <tr>
            <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#6b7280">Total</td>
            <td style="font-family:system-ui,-apple-system,sans-serif;font-size:22px;font-weight:900;color:#0421ff;text-align:right;letter-spacing:-0.5px">${fmt(order.total)}</td>
          </tr>
        </table>
      `, '#eef2ff')}

      ${divider()}
      ${metaTable([
        ['Paiement', paymentLabel],
        ['Livraison', deliveryLabel],
      ])}

      ${ctaButton('Suivre ma commande', `${frontUrl}/commandes/${order.orderNumber}`)}
    `, `Votre commande ${order.orderNumber} est confirmée.`)

  await send(to, `Commande ${order.orderNumber} confirmée ✓`, html)
}
