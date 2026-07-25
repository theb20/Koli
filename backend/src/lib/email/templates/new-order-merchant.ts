import { send }       from '../client'
import { baseLayout } from '../layout'
import { subheading, heading, paragraph, ctaButton } from '../components'

export type NewOrderMerchantPayload = {
  orderNumber: string
  itemCount:   number
}

/*
 * Contenu volontairement minimal — même contrainte que la notification
 * in-app (voir orders.ts, étape 6e) : pas d'identité client, pas de détail
 * des articles, pas d'adresse. Le marchand ne reçoit le détail complet
 * qu'une fois le paiement confirmé, via koli-marchand.
 */
export async function sendNewOrderMerchantEmail(to: string, order: NewOrderMerchantPayload): Promise<void> {
  const merchantUrl = process.env.MERCHANT_URL ?? 'https://me.skignas.com'

  const html = await baseLayout(`
      ${subheading('Nouvelle commande')}
      ${heading('🛎️ Vous avez une nouvelle commande')}
      ${paragraph(`
        ${order.itemCount} article${order.itemCount > 1 ? 's' : ''} commandé${order.itemCount > 1 ? 's' : ''} dans votre boutique —
        commande <strong style="color:#111827">${order.orderNumber}</strong>.
      `)}
      ${paragraph('Les détails (client, articles, adresse de livraison) s\'affichent dans votre espace marchand dès que le paiement est confirmé.', 'color:#6b7280;font-size:14px')}
      ${ctaButton('Voir mes commandes', `${merchantUrl}/commandes`)}
    `, `Nouvelle commande ${order.orderNumber}`)

  await send(to, `🛎️ Nouvelle commande — ${order.orderNumber}`, html)
}
