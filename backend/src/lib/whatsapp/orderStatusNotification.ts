import { sendWhatsAppTemplate, isWhatsAppConfigured, type TemplateComponent } from './client'

/**
 * Nom du template WhatsApp à créer et faire approuver dans le gestionnaire
 * Meta Business avant que cet envoi fonctionne réellement — tant qu'il
 * n'existe pas côté Meta (ou que WHATSAPP_ACCESS_TOKEN/PHONE_NUMBER_ID sont
 * absents), sendOrderStatusWhatsApp() ne fait rien (voir client.ts). Le nom
 * par défaut est un repère, pas une garantie que ce template existe déjà.
 */
const TEMPLATE_NAME = process.env.WHATSAPP_ORDER_STATUS_TEMPLATE ?? 'order_status_update'
const TEMPLATE_LANG = process.env.WHATSAPP_ORDER_STATUS_TEMPLATE_LANG ?? 'fr'

const STATUS_LABELS: Record<string, string> = {
  pending:    'en attente',
  confirmed:  'confirmée',
  processing: 'en préparation',
  shipped:    'chez le livreur',
  delivered:  'livrée',
  cancelled:  'annulée',
  refunded:   'remboursée',
}

export type OrderStatusWhatsAppPayload = {
  orderNumber: string
  orderId:     string
  clientNom:   string
  status:      string
}

/**
 * Notifie le client d'un changement de statut via WhatsApp — même pattern
 * de dégradation gracieuse que newOrderNotification.ts (silencieux si la
 * Cloud API n'est pas configurée, jamais bloquant pour la transition de
 * statut elle-même).
 */
export async function sendOrderStatusWhatsApp(to: string, order: OrderStatusWhatsAppPayload): Promise<void> {
  if (!isWhatsAppConfigured()) return

  const components: TemplateComponent[] = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: order.clientNom },
        { type: 'text', text: order.orderNumber },
        { type: 'text', text: STATUS_LABELS[order.status] ?? order.status },
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
