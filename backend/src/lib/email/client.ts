import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)
export const FROM   = process.env.EMAIL_FROM ?? 'Skignas <noreply@skignas.ahobaut.fr>'

/**
 * Envoie un email via Resend.
 * Lance une erreur si l'API renvoie une erreur.
 */
export async function send(to: string, subject: string, html: string): Promise<void> {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) throw new Error(`Resend error [${error.name}]: ${error.message}`)
}
