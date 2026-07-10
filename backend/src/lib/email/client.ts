import { Resend } from 'resend'
import { AsyncLocalStorage } from 'node:async_hooks'

export const resend = new Resend(process.env.RESEND_API_KEY)
export const FROM   = process.env.EMAIL_FROM ?? 'Skignas <noreply@skignas.com>'

/**
 * Contexte de capture pour la prévisualisation (GET /api/email-templates/:name) :
 * quand actif, send() écrit le HTML dans le store au lieu d'appeler Resend.
 * Isolé par requête via AsyncLocalStorage — contrairement à un monkey-patch de
 * resend.emails.send sur l'objet partagé, un vrai envoi concurrent (ex: un
 * reset de mot de passe pendant qu'un admin prévisualise un template) ne peut
 * jamais être intercepté par erreur ni avalé silencieusement.
 */
export const emailCaptureContext = new AsyncLocalStorage<{ html: string }>()

/**
 * Envoie un email via Resend.
 * Lance une erreur si l'API renvoie une erreur.
 */
export async function send(to: string, subject: string, html: string): Promise<void> {
  const capture = emailCaptureContext.getStore()
  if (capture) { capture.html = html; return }

  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) throw new Error(`Resend error [${error.name}]: ${error.message}`)
}
