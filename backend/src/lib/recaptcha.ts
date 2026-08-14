import { logger } from './logger'

const SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY
const MIN_SCORE   = 0.5

type SiteVerifyResponse = {
  success: boolean
  score?: number
  action?: string
  'error-codes'?: string[]
}

/**
 * Vérifie un jeton reCAPTCHA v3 auprès de Google. Si RECAPTCHA_SECRET_KEY
 * n'est pas configurée (dev local, environnements de test), la vérification
 * est un no-op qui laisse toujours passer — évite de casser le login/register
 * en local tant que la clé n'est pas fournie par l'admin Skignas.
 */
export async function verifyRecaptcha(token: string | undefined, expectedAction: string): Promise<boolean> {
  if (!SECRET_KEY) return true
  if (!token) return false

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: SECRET_KEY, response: token }),
    })
    const data = await res.json() as SiteVerifyResponse

    if (!data.success) {
      logger.warn('[recaptcha] échec', { errors: data['error-codes'] })
      return false
    }
    if (data.action !== expectedAction) {
      logger.warn('[recaptcha] action inattendue', { expected: expectedAction, got: data.action })
      return false
    }
    if ((data.score ?? 0) < MIN_SCORE) {
      logger.warn('[recaptcha] score trop bas', { score: data.score, action: expectedAction })
      return false
    }
    return true
  } catch (err) {
    // Google injoignable — on ne bloque pas la connexion pour une panne tierce,
    // les autres protections (rate-limit, verrouillage de compte) restent actives.
    logger.error('[recaptcha] vérification impossible', err)
    return true
  }
}
