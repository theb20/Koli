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

/**
 * Précharge le script reCAPTCHA v3 sans générer de jeton. À appeler au
 * montage des pages Connexion/Inscription : sans ça, le script (et donc le
 * badge "protégé par reCAPTCHA") ne se charge qu'au moment du submit, ce qui
 * laisse la page sans badge visible pendant que l'utilisateur remplit le
 * formulaire — Google exige que ce badge reste visible tant que la page est
 * protégée. Ne fait rien si VITE_RECAPTCHA_SITE_KEY n'est pas configurée.
 */
export function preloadRecaptcha(): void {
  if (!SITE_KEY) return
  loadScript().catch(() => {})
}

/**
 * Renvoie un jeton reCAPTCHA v3 pour l'action donnée ("login", "register"...).
 * Renvoie `undefined` si VITE_RECAPTCHA_SITE_KEY n'est pas configurée (dev
 * local) — le backend traite alors l'absence de jeton comme un no-op tant
 * que RECAPTCHA_SECRET_KEY n'est pas non plus configurée côté serveur.
 * N'importe jamais d'échec bloquant : une panne de chargement du script ne
 * doit pas empêcher un utilisateur légitime de se connecter.
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
