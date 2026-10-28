import { send }         from '../client'
import { baseLayout }   from '../layout'
import { getEmailTokens } from '../tokens'
import { subheading, heading, paragraph, ctaButton } from '../components'

/**
 * E-mail de sécurité composé librement par un admin (voir
 * routes/admin-security-emails.ts) — distinct de sendSecurityUpdateEmail
 * (annonce fixe de fonctionnalités). `subject` sert à la fois d'objet
 * d'e-mail et de titre affiché, comme sendBroadcastEmail.
 */
export async function sendSecurityAlertEmail(to: string, prenom: string, subject: string, message: string): Promise<void> {
  const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.com'
  const { greeting } = await getEmailTokens()

  const html = await baseLayout(`
      ${subheading('Sécurité du compte', '#d93025', '#d93025')}
      ${heading(`${greeting} ${prenom},`)}
      ${paragraph(subject, 'font-weight:700;color:#111827;font-size:16px')}
      ${paragraph(message)}

      ${ctaButton('Vérifier mon compte', `${frontUrl}/profil`, '#d93025')}
      `, subject)

  await send(to, subject, html)
}
