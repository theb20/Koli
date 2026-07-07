import { send }       from '../client'
import { baseLayout } from '../layout'
import { subheading, heading, paragraph, ctaButton } from '../components'

export async function sendBroadcastEmail(to: string, prenom: string, title: string, message: string): Promise<void> {
  const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.com'

  const html = await baseLayout(`
      ${subheading('Annonce Skignas')}
      ${heading(`Bonjour ${prenom},`)}
      ${paragraph(title, 'font-weight:700;color:#111827;font-size:16px')}
      ${paragraph(message)}

      ${ctaButton('Découvrir le catalogue', `${frontUrl}/catalogue`)}
      `, title)

  await send(to, title, html)
}
