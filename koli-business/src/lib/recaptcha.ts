const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    if (window.grecaptcha) { resolve(); return }
    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('reCAPTCHA n\'a pas pu être chargé'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

/** Précharge le script dès le montage de la page d'inscription — voir koili/src/lib/recaptcha.ts. */
export function preloadRecaptcha(): void {
  if (!SITE_KEY) return
  loadScript().catch(() => {})
}

/**
 * Jeton reCAPTCHA v3 pour l'action donnée. /api/auth/register est un
 * endpoint partagé (koili, koli-business) — le backend l'exige désormais
 * dès que RECAPTCHA_SECRET_KEY est configurée côté serveur. Renvoie
 * `undefined` si VITE_RECAPTCHA_SITE_KEY est absente.
 */
export async function getRecaptchaToken(action: string): Promise<string | undefined> {
  if (!SITE_KEY) return undefined
  try {
    await loadScript()
    return await new Promise<string>((resolve, reject) => {
      window.grecaptcha!.ready(() => {
        window.grecaptcha!.execute(SITE_KEY, { action }).then(resolve).catch(reject)
      })
    })
  } catch {
    return undefined
  }
}
