/* ─────────────────────────────────────────────────────────────
   Client WhatsApp Business Cloud API (Meta) — envoi de messages
   modèles (templates) uniquement, comme l'exige Meta pour tout
   message envoyé à l'initiative de l'entreprise (pas de session
   client ouverte depuis moins de 24h).

   Configuration (backend/.env) :
     WHATSAPP_ACCESS_TOKEN      — jeton d'accès permanent (System User)
     WHATSAPP_PHONE_NUMBER_ID   — ID du numéro expéditeur Cloud API
     WHATSAPP_API_VERSION       — optionnel, défaut "v20.0"

   Tant que ces variables sont absentes, isWhatsAppConfigured() est
   false et tout appelant doit sauter l'envoi — jamais d'erreur ni de
   blocage du flux principal (commande, etc.) pour une notification
   secondaire. Voir lib/whatsapp/newOrderNotification.ts pour l'usage.
───────────────────────────────────────────────────────────── */

const API_VERSION = process.env.WHATSAPP_API_VERSION ?? 'v20.0'

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
}

export type TemplateComponent =
  | { type: 'body'; parameters: { type: 'text'; text: string }[] }
  | { type: 'button'; sub_type: 'url'; index: string; parameters: { type: 'text'; text: string }[] }

/**
 * Envoie un message modèle (template) pré-approuvé par Meta.
 * Lance une erreur si la config est absente ou si l'API refuse l'envoi —
 * à l'appelant de décider si l'échec doit être silencieux (.catch(() => {})).
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  components: TemplateComponent[],
): Promise<void> {
  const token         = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneNumberId) {
    throw new Error('WhatsApp Cloud API non configurée (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID manquants)')
  }

  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to.replace(/[^\d]/g, ''), // format E.164 sans "+" ni espaces attendu par l'API
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`WhatsApp API error [${res.status}]: ${body}`)
  }
}
