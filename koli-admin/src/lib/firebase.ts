import { initializeApp, getApps } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

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
   AUTH
───────────────────────────────────────── */
export const auth = getAuth(app)

export const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('email')
googleProvider.addScope('profile')
googleProvider.setCustomParameters({ prompt: 'select_account' })

/* ─────────────────────────────────────────
   ANALYTICS — usage interne (backoffice), pas de bannière RGPD nécessaire
───────────────────────────────────────── */
export async function initAnalytics() {
  if (typeof window === 'undefined') return null
  const supported = await isSupported()
  if (!supported) return null
  return getAnalytics(app)
}
