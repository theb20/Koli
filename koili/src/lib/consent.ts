/* ─────────────────────────────────────────────────────────────
   Consentement cookies — Google Consent Mode v2 + chargement de Google
   Tag Manager UNIQUEMENT après acceptation (analytique ou marketing).
   Avant tout choix : rien n'est chargé et tout est refusé par défaut.
   Retrait du consentement : consentement repassé à « refusé » et
   suppression des cookies Google Analytics (_ga*).
───────────────────────────────────────────────────────────── */
export type CookiePrefs = {
  necessary:   true
  analytics:   boolean
  marketing:   boolean
  preferences: boolean
}

export const CONSENT_STORAGE_KEY = 'koli_cookie_consent'
export const OPEN_COOKIE_SETTINGS_EVENT = 'skignas:open-cookie-settings'
const GTM_ID = 'GTM-P5D7FBW4'

type Gtag = (...args: unknown[]) => void
declare global {
  interface Window { dataLayer?: unknown[]; gtag?: Gtag }
}

function gtag(...args: unknown[]) {
  window.dataLayer = window.dataLayer || []
  // gtag() doit pousser l'objet `arguments`, pas un tableau (format attendu par Google)
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments)
  void args
}

/** À appeler au démarrage, avant tout : tout refusé par défaut. */
export function initConsentDefaults() {
  window.gtag = gtag
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted',
    wait_for_update: 500,
  })
}

let gtmLoaded = false
function loadGtm() {
  if (gtmLoaded) return
  gtmLoaded = true
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`
  document.head.appendChild(s)
}

/** Supprime les cookies Google Analytics (_ga, _ga_XXXX) sur tous les domaines parents. */
function clearGaCookies() {
  const host = window.location.hostname
  const domains = ['', host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`]
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0]!.trim()
    if (!name.startsWith('_ga')) continue
    for (const d of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`
    }
  }
}

export function readConsent(): CookiePrefs | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CookiePrefs) : null
  } catch { return null }
}

/** Applique un choix (au démarrage si déjà enregistré, ou depuis le bandeau). */
export function applyConsent(p: CookiePrefs) {
  const g = (v: boolean) => (v ? 'granted' : 'denied')
  gtag('consent', 'update', {
    analytics_storage: g(p.analytics),
    ad_storage: g(p.marketing),
    ad_user_data: g(p.marketing),
    ad_personalization: g(p.marketing),
    functionality_storage: g(p.preferences),
    personalization_storage: g(p.preferences),
  })
  if (p.analytics || p.marketing) loadGtm()
  if (!p.analytics) clearGaCookies()
}

export function saveConsent(p: CookiePrefs) {
  try { localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(p)) } catch { /* navigation privée */ }
  applyConsent(p)
}

/** Rouvre le bandeau (lien « Gérer les cookies »). */
export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))
