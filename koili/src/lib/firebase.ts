import { initializeApp, getApps } from 'firebase/app'
import { getAnalytics, setAnalyticsCollectionEnabled, isSupported } from 'firebase/analytics'

/* ─────────────────────────────────────────
   CONFIG — valeurs dans .env
───────────────────────────────────────── */
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

/* ─────────────────────────────────────────
   INIT — singleton (évite double init en dev HMR)
───────────────────────────────────────── */
export const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0]

/* ─────────────────────────────────────────
   ANALYTICS — désactivé par défaut (RGPD)
   Activé uniquement si l'utilisateur consent
───────────────────────────────────────── */
let analyticsInstance: Awaited<ReturnType<typeof getAnalytics>> | null = null

/** Appeler après le consentement cookie → active la collecte */
export async function enableAnalytics() {
  if (typeof window === 'undefined') return
  const supported = await isSupported()
  if (!supported) return

  if (!analyticsInstance) {
    analyticsInstance = getAnalytics(app)
  }
  setAnalyticsCollectionEnabled(analyticsInstance, true)
}

/** Appeler si l'utilisateur refuse → désactive la collecte */
export async function disableAnalytics() {
  if (!analyticsInstance) return
  setAnalyticsCollectionEnabled(analyticsInstance, false)
}

export { analyticsInstance as analytics }
