/* ─────────────────────────────────────────────────────────────
   Client SMS Zavu — envoi sortant uniquement (OTP, notifications de
   paiement), pas de réception : aucune route webhook associée.

   Configuration (backend/.env) :
     ZAVU_API_KEY    — jeton d'accès (Bearer)
     ZAVU_SENDER_ID  — identifiant expéditeur fourni par Zavu

   Tant que ces variables sont absentes, isZavuConfigured() est false et
   tout appelant doit sauter l'envoi — jamais d'erreur ni de blocage du
   flux principal (inscription, commande...) pour un SMS secondaire.
───────────────────────────────────────────────────────────── */

const ZAVU_API_URL = 'https://api.zavu.dev/v1/messages'

export function isZavuConfigured(): boolean {
  return Boolean(process.env.ZAVU_API_KEY && process.env.ZAVU_SENDER_ID)
}

/**
 * Envoie un SMS. Lance une erreur si la config est absente ou si l'API
 * refuse l'envoi — à l'appelant de décider si l'échec doit être silencieux
 * (.catch(() => {})), comme pour WhatsApp/email.
 */
export async function sendSms(to: string, text: string): Promise<void> {
  const apiKey   = process.env.ZAVU_API_KEY
  const senderId = process.env.ZAVU_SENDER_ID
  if (!apiKey || !senderId) {
    throw new Error('Zavu non configuré (ZAVU_API_KEY / ZAVU_SENDER_ID manquants)')
  }

  const res = await fetch(ZAVU_API_URL, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      'Zavu-Sender':  senderId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, text }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Zavu: échec envoi SMS (HTTP ${res.status}) ${body}`)
  }
}
