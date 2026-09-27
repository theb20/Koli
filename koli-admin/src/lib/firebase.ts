import { initializeApp, getApps } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'

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

/* Pas de Firebase Auth : la connexion à l'admin passe par le JWT du
   backend (/api/auth/login). L'initialiser pour rien interrogeait
   identitytoolkit, en erreur CONFIGURATION_NOT_FOUND (Auth non activé
   sur le projet Firebase de l'admin). */

/* ─────────────────────────────────────────
   ANALYTICS — usage interne (backoffice), pas de bannière RGPD nécessaire
───────────────────────────────────────── */
export async function initAnalytics() {
  if (typeof window === 'undefined') return null
  const supported = await isSupported()
  if (!supported) return null
  return getAnalytics(app)
}
