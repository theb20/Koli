/**
 * Doit être importé en tout premier (avant app.ts et toute autre route) pour
 * que l'instrumentation automatique de Sentry (requêtes HTTP sortantes,
 * requêtes Prisma...) s'applique aux modules chargés ensuite. Tant que
 * SENTRY_DSN est absent, Sentry.init() se désactive tout seul — rien ne
 * casse, aucune erreur ne part nulle part.
 */
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  // Échantillon des traces de performance — 100% serait coûteux/inutile en
  // prod à volume réel ; 20% donne une vue représentative sans exploser le
  // quota gratuit.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  // Ne jamais envoyer le contenu des requêtes (cookies, headers d'auth...) —
  // seule l'erreur elle-même (message, stack) part vers Sentry.
  sendDefaultPii: false,
})
