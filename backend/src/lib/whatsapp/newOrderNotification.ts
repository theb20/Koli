import { sendWhatsAppTemplate, isWhatsAppConfigured, type TemplateComponent } from './client'

const TEMPLATE_NAME = process.env.WHATSAPP_ORDER_TEMPLATE ?? 'new_order_notification'
const TEMPLATE_LANG = process.env.WHATSAPP_ORDER_TEMPLATE_LANG ?? 'fr'

const PAYMENT_LABELS: Record<string, string> = {
  orange: 'Orange Money',
  mtn:    'MTN Mobile Money',
  wave:   'Wave',
  cash:   'Paiement à la livraison',
}

export type NewOrderWhatsAppPayload = {
  orderNumber:     string
  orderId:         string
  clientNom:       string
  clientTelephone: string
  total:           number
  paymentMethod:   string
}

/**
 * Notifie l'équipe (SiteSettings.whatsappNumber) d'une nouvelle commande via
 * un message modèle WhatsApp — voir client.ts pour la configuration requise.
 * Ne fait rien (silencieux) si l'API n'est pas configurée ; à l'appelant de
 * décider s'il veut logger l'échec (.catch()) — jamais bloquant pour la commande.
 */
export async function sendNewOrderWhatsAppNotification(to: string, order: NewOrderWhatsAppPayload): Promise<void> {
  if (!isWhatsAppConfigured()) return

  const components: TemplateComponent[] = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: order.orderNumber },
        { type: 'text', text: order.clientNom },
        { type: 'text', text: order.clientTelephone },
        { type: 'text', text: order.total.toLocaleString('fr-FR') },
        { type: 'text', text: PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod },
      ],
    },
    {
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: order.orderId }],
    },
  ]

  await sendWhatsAppTemplate(to, TEMPLATE_NAME, TEMPLATE_LANG, components)
}
