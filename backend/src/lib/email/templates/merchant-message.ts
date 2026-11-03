import { send }       from '../client'
import { baseLayout } from '../layout'
import { subheading, heading, paragraph, ctaButton } from '../components'

export type NewMerchantMessagePayload = {
  storeName: string
  body:      string
  storeId:   number
}

/** Marchand → équipe Skignas (koli-admin). */
export async function sendNewMerchantMessageEmail(to: string, m: NewMerchantMessagePayload): Promise<void> {
  const adminUrl = process.env.ADMIN_URL ?? 'https://adminskignas.web.app'

  const html = await baseLayout(`
      ${subheading('Nouveau message marchand')}
      ${heading(`💬 ${m.storeName}`)}
      ${paragraph(m.body.length > 300 ? `${m.body.slice(0, 300)}…` : m.body, 'color:#374151;font-size:14px')}
      ${ctaButton('Répondre', `${adminUrl}/messages/${m.storeId}`)}
    `, `Message de ${m.storeName}`)

  await send(to, `💬 ${m.storeName} vous a écrit`, html)
}

export type NewAdminMessagePayload = {
  body: string
}

/** Équipe Skignas → marchand (koli-marchand). */
export async function sendNewAdminMessageEmail(to: string, m: NewAdminMessagePayload): Promise<void> {
  const merchantUrl = process.env.MERCHANT_URL ?? 'https://me.skignas.com'

  const html = await baseLayout(`
      ${subheading('Nouveau message de l\'équipe Skignas')}
      ${heading('💬 Vous avez une réponse')}
      ${paragraph(m.body.length > 300 ? `${m.body.slice(0, 300)}…` : m.body, 'color:#374151;font-size:14px')}
      ${ctaButton('Voir la conversation', `${merchantUrl}/messages`)}
    `, "Nouveau message de l'équipe Skignas")

  await send(to, "💬 L'équipe Skignas vous a répondu", html)
}
