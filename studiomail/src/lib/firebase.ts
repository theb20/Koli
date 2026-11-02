/* ─────────────────────────────────────────────────────────────
   Initialisation Firebase (projet studio-mail-22d14) — App + Analytics
   uniquement pour l'instant (pas d'auth, pas de Firestore : StudioMail
   reste local-first, voir lib/storage.ts). Config lue depuis les
   variables d'environnement VITE_FIREBASE_* (.env, hors dépôt), jamais
   codée en dur — même convention que koli-admin/koili.
───────────────────────────────────────────────────────────── */
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const firebaseApp: FirebaseApp | null = firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null

let analyticsPromise: Promise<Analytics | null> | null = null

/**
 * Analytics ne fonctionne pas dans tous les contextes (navigation privée,
 * bloqueurs de traqueurs, SSR) — isSupported() évite un throw silencieux
 * qui casserait le chargement de l'app. Appelé une seule fois, résultat
 * mis en cache (voir main.tsx).
 */
export function initAnalytics(): Promise<Analytics | null> {
  if (!firebaseApp) return Promise.resolve(null)
  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then(ok => (ok && firebaseApp ? getAnalytics(firebaseApp) : null))
      .catch(() => null)
  }
  return analyticsPromise
}
